'use client';

/**
 * lib/sound.ts
 * 
 * Replaced Web Audio API with simple HTML5 Audio.
 * Uses MP3 files from /public/sounds/
 */

function playFile(path: string, volume: number = 0.5) {
    if (typeof window === 'undefined') return;
    try {
        const audio = new Audio(path);
        audio.volume = volume;
        audio.play().catch(() => {
            // Browsers block audio until first user interaction
            // This is expected and handled gracefully
        });
    } catch (e) {
        console.warn('Sound play failed:', e);
    }
}

/** Play your custom card play sound */
export function playCardPlay() {
    playFile('/sounds/card-play.mp3', 0.6);
}

/** Play your custom card draw sound */
export function playCardDraw() {
    playFile('/sounds/card-draw.mp3', 0.5);
}

/** Placeholder for UNO shout (feel free to add uno.mp3 later) */
export function playUNO() {
    playFile('/sounds/uno-shout.mp3', 0.7);
}

/** Placeholder for Win fanfare (feel free to add win.mp3 later) */
export function playWin() {
    playFile('/sounds/victory.mp3', 0.6);
}

/** Subtle turn start notification */
export function playTurnStart() {
    playFile('/sounds/turn-start.mp3', 0.3);
}

/** Error buzz */
export function playError() {
    playFile('/sounds/error.mp3', 0.4);
}
