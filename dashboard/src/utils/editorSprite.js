/**
 * Maps editor names to their custom sprite filename.
 * If an editor's name (first word) matches a key here, use that sprite.
 * Otherwise fall back to stage-based defaults: farmer for Stage 1, or the API sprite for Stage 2+.
 */
const CUSTOM_SPRITE_BY_NAME = {
    'alfredo': 'alfredo',
    'bao': 'bao',
    'baran': 'baran',
    'denis': 'denis',
    'dusan': 'dusan',
    'jerome': 'jerome',
    'kevin': 'kevin',
    'konrad': 'konrad',
    'maximilian': 'maximillian',
    'nico': 'nico',
    'patryk': 'patryk',
    'saskia': 'saskia',
    'shawn': 'shawn',
    'tim': 'tim',
    'tobias': 'tobias',
    'vladimir': 'vladimir',
}

export function getEditorSpriteSrc(editor) {
    // Check by first name for a custom sprite override
    const firstName = (editor.name || '').split(' ')[0].toLowerCase()
    const customSprite = CUSTOM_SPRITE_BY_NAME[firstName]
    if (customSprite) {
        return `/editors/editor-${customSprite}.png`
    }
    // Stage-based fallback for editors without custom sprites
    const isNewbie = editor.rank && editor.rank.toLowerCase().includes('stage 1')
    return `/editors/editor-${isNewbie ? 'newbie' : editor.sprite}.png`
}
