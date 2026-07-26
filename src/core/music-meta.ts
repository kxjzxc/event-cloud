/**
 * Enrich MusicTrack with title / artist / cover via platform APIs.
 * Failures are non-fatal — build continues with whatever we already have.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { MusicTrack } from '../types';

const execFileAsync = promisify(execFile);

const GENERIC_TITLE =
  /^(网易云(音乐)?|spotify|Spotify|网易云\s*·|Spotify\s*(单曲|专辑)?\s*·)/i;

function isGenericTitle(title?: string): boolean {
  if (!title || !title.trim()) return true;
  return GENERIC_TITLE.test(title.trim());
}

async function fetchText(url: string, extraHeaders: string[] = []): Promise<string | null> {
  // Prefer curl so HTTPS_PROXY / http_proxy are honored (Node fetch often ignores them).
  try {
    const args = [
      '-sS',
      '-L',
      '--max-time',
      '15',
      '-A',
      'Mozilla/5.0 (compatible; EventCloud/1.0; +https://github.com/kxjzxc/event-cloud)',
      ...extraHeaders.flatMap((h) => ['-H', h]),
      url,
    ];
    const { stdout } = await execFileAsync('curl', args, {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    });
    return stdout;
  } catch {
    // Fallback to native fetch (may fail without proxy)
    try {
      const res = await fetch(url, {
        headers: {
          Accept: '*/*',
          'User-Agent':
            'Mozilla/5.0 (compatible; EventCloud/1.0; +https://github.com/kxjzxc/event-cloud)',
        },
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }
}

async function fetchJson(url: string, extraHeaders: string[] = []): Promise<any | null> {
  const text = await fetchText(url, ['Accept: application/json', ...extraHeaders]);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function enrichNetEase(track: MusicTrack): Promise<void> {
  const data = await fetchJson(
    `https://music.163.com/api/song/detail/?ids=[${encodeURIComponent(track.id)}]`,
    ['Referer: https://music.163.com/'],
  );
  const song = data?.songs?.[0];
  if (!song) return;

  if (song.name && (isGenericTitle(track.title) || !track.title)) {
    track.title = String(song.name);
  }
  const artists = Array.isArray(song.artists)
    ? song.artists.map((a: { name?: string }) => a?.name).filter(Boolean)
    : [];
  if (artists.length && !track.artist) {
    track.artist = artists.join(' / ');
  }
  const cover = song.album?.picUrl || song.album?.blurPicUrl;
  if (cover && !track.coverUrl) {
    track.coverUrl = String(cover).replace(/^http:\/\//i, 'https://');
  }
  const duration = Number(song.duration ?? song.dt);
  if (Number.isFinite(duration) && duration > 0) {
    track.durationMs = duration;
  }
  // Outer URL redirects to an mp3 for many free tracks — enables <audio> + progress bar.
  if (!track.audioUrl) {
    track.audioUrl = `https://music.163.com/song/media/outer/url?id=${track.id}.mp3`;
  }
}

async function enrichSpotify(track: MusicTrack): Promise<void> {
  const pageUrl = `https://open.spotify.com/track/${track.id}`;
  const oembed = await fetchJson(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(pageUrl)}`,
  );
  if (oembed) {
    if (oembed.title && (isGenericTitle(track.title) || !track.title)) {
      track.title = String(oembed.title);
    }
    if (oembed.thumbnail_url && !track.coverUrl) {
      track.coverUrl = String(oembed.thumbnail_url);
    }
  }

  // No stable public audio URL for Spotify → player uses embed (no live progress).
  if (track.artist && track.durationMs) return;

  const html = await fetchText(`https://open.spotify.com/embed/track/${track.id}`);
  if (!html) return;

  if (!track.artist) {
    const artists: string[] = [];
    const block = html.match(/"artists"\s*:\s*\[([^\]]*)\]/);
    if (block) {
      const nameRe = /"name"\s*:\s*"((?:\\.|[^"\\])*)"/g;
      let m: RegExpExecArray | null;
      while ((m = nameRe.exec(block[1])) !== null) {
        artists.push(m[1].replace(/\\"/g, '"'));
      }
    }
    if (artists.length) {
      track.artist = artists.join(' / ');
    }
  }

  if (!track.durationMs) {
    const dur = html.match(/"duration"\s*:\s*(\d+)/);
    if (dur) {
      const ms = parseInt(dur[1], 10);
      if (ms > 0) track.durationMs = ms;
    }
  }
}

export async function enrichMusicTrack(track: MusicTrack): Promise<MusicTrack> {
  if (track.platform === 'netease') {
    await enrichNetEase(track);
  } else if (track.platform === 'spotify') {
    await enrichSpotify(track);
  }
  return track;
}

export async function enrichEventTracks(tracks: MusicTrack[]): Promise<void> {
  // Sequential to be gentle on third-party APIs
  for (const track of tracks) {
    await enrichMusicTrack(track);
  }
}
