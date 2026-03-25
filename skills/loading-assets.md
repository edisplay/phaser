# Loading Assets
> The Phaser Loader (`this.load`) handles fetching all external content: images, audio, JSON, tilemaps, atlases, fonts, scripts, and more. Assets are queued in `preload()`, loaded in parallel, and placed into global caches accessible by every Scene.

**Key source paths:** `src/loader/LoaderPlugin.js`, `src/loader/File.js`, `src/loader/filetypes/`, `src/loader/events/`
**Related skills files:** game-setup-and-config.md, scenes.md, sprites-and-images.md

## Quick Start

```js
class GameScene extends Phaser.Scene {
    preload() {
        this.load.image('logo', 'assets/logo.png');
    }

    create() {
        this.add.image(400, 300, 'logo');
    }
}
```

Assets loaded in `preload()` are guaranteed to be ready when `create()` runs. The Loader starts automatically during the preload phase.

## Core Concepts

### The Preload Pattern

Every Scene can define a `preload()` method. The Loader automatically starts when `preload()` completes and waits for all queued files to finish before calling `create()`.

```js
preload() {
    // Queue files - they don't load immediately
    this.load.image('sky', 'assets/sky.png');
    this.load.spritesheet('dude', 'assets/dude.png', { frameWidth: 32, frameHeight: 48 });
    this.load.audio('jump', 'assets/jump.mp3');
}

create() {
    // All assets above are now available
    this.add.image(400, 300, 'sky');
    this.add.sprite(100, 450, 'dude');
    this.sound.play('jump');
}
```

### Loading Outside of Preload

If you call `this.load` methods outside of `preload()` (for example, in `create()` or in response to a user action), you must manually start the Loader:

```js
create() {
    this.load.image('extra', 'assets/extra.png');
    this.load.once('complete', () => {
        this.add.image(400, 300, 'extra');
    });
    this.load.start();
}
```

### URL Resolution: baseURL, path, and prefix

The final URL for a file is resolved as: `baseURL + path + filename`. These can be set via the game config or at runtime.

```js
preload() {
    // Set base URL (prepended to all relative paths)
    this.load.setBaseURL('https://cdn.example.com/');

    // Set path (prepended after baseURL, before filename)
    this.load.setPath('assets/images/');

    // Set key prefix (prepended to the cache key, not the URL)
    this.load.setPrefix('LEVEL1.');

    // Loads from: https://cdn.example.com/assets/images/hero.png
    // Cached with key: LEVEL1.hero
    this.load.image('hero', 'hero.png');

    // Absolute URLs bypass the path/baseURL
    this.load.image('cloud', 'https://other-server.com/cloud.png');
}
```

These can also be set in the game config:

```js
const config = {
    loader: {
        baseURL: 'https://cdn.example.com/',
        path: 'assets/',
        prefix: '',
        maxParallelDownloads: 32,
        crossOrigin: 'anonymous',
        responseType: '',
        async: true,
        timeout: 0,
        maxRetries: 2,
        imageLoadType: 'XHR' // or 'HTMLImageElement'
    }
};
```

### Global Caches

Assets are stored in global game-level caches, not per-Scene. An image loaded in one Scene is available in every other Scene. Textures go into `game.textures` (the Texture Manager). Other data goes into `game.cache` sub-caches (e.g., `game.cache.json`, `game.cache.audio`, `game.cache.xml`).

### Load Events

The Loader emits events throughout the loading lifecycle. Use these for progress bars and loading screens.

```js
preload() {
    this.load.on('progress', (value) => {
        // value is 0 to 1
        console.log(`Loading: ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
        console.log('All assets loaded');
    });

    this.load.on('loaderror', (file) => {
        console.warn('Failed to load:', file.key);
    });

    this.load.image('bg', 'assets/bg.png');
}
```

## Common Patterns

### Loading Images and Sprite Sheets

```js
preload() {
    // Single image
    this.load.image('star', 'assets/star.png');

    // Image with normal map (pass URL array: [texture, normalMap])
    this.load.image('brick', ['assets/brick.png', 'assets/brick_n.png']);

    // Sprite sheet (fixed frame sizes)
    this.load.spritesheet('explosion', 'assets/explosion.png', {
        frameWidth: 64,
        frameHeight: 64,
        startFrame: 0,
        endFrame: 23,
        margin: 0,
        spacing: 0
    });

    // SVG (optionally rasterize at a specific size)
    this.load.svg('logo', 'assets/logo.svg', { width: 400, height: 400 });
}
```

### Loading Audio

```js
preload() {
    // Single file
    this.load.audio('bgm', 'assets/music.mp3');

    // Multiple formats for cross-browser support
    this.load.audio('bgm', ['assets/music.ogg', 'assets/music.mp3']);

    // Audio sprite (JSON defines named regions within a single audio file)
    this.load.audioSprite('sfx', 'assets/sfx.json', [
        'assets/sfx.ogg',
        'assets/sfx.mp3'
    ]);
}
```

### Loading JSON and Tilemaps

```js
preload() {
    // JSON data (stored in this.cache.json)
    this.load.json('levelData', 'assets/level1.json');

    // JSON with a dataKey to extract a sub-object
    this.load.json('enemies', 'assets/data.json', 'enemies');

    // Tiled tilemap (JSON format exported from Tiled)
    this.load.tilemapTiledJSON('map', 'assets/map.json');

    // CSV tilemap
    this.load.tilemapCSV('csvmap', 'assets/level.csv');

    // Impact tilemap
    this.load.tilemapImpact('impactmap', 'assets/level.js');
}

create() {
    const data = this.cache.json.get('levelData');
    const map = this.make.tilemap({ key: 'map' });
}
```

### Loading Atlases

```js
preload() {
    // JSON atlas (e.g., TexturePacker JSON Hash/Array)
    this.load.atlas('sprites', 'assets/sprites.png', 'assets/sprites.json');

    // XML atlas (e.g., Starling/Sparrow format)
    this.load.atlasXML('ui', 'assets/ui.png', 'assets/ui.xml');

    // Multi-atlas (atlas split across multiple textures)
    this.load.multiatlas('world', 'assets/world.json', 'assets/');

    // Unity texture atlas format
    this.load.unityAtlas('chars', 'assets/chars.png', 'assets/chars.txt');

    // Aseprite atlas
    this.load.aseprite('knight', 'assets/knight.png', 'assets/knight.json');
}

create() {
    this.add.sprite(400, 300, 'sprites', 'walk_01');
}
```

### Loading Bitmap Fonts

```js
preload() {
    // Requires both a texture and XML/JSON font data file
    this.load.bitmapFont('pixels', 'assets/font.png', 'assets/font.xml');
}

create() {
    this.add.bitmapText(100, 100, 'pixels', 'Hello World', 32);
}
```

### Loading Video

```js
preload() {
    // Load a video file. Third arg: noAudio flag (default false)
    this.load.video('intro', 'assets/intro.mp4');

    // Load without audio track
    this.load.video('bg_loop', 'assets/loop.mp4', true);
}
```

### Loading Web Fonts

```js
preload() {
    // Load a font file (ttf, otf, woff, woff2)
    this.load.font('myFont', 'assets/myfont.ttf', 'truetype');

    // With optional font face descriptors
    this.load.font('boldFont', 'assets/bold.woff2', 'woff2', {
        weight: 'bold',
        style: 'normal'
    });
}
```

### Loading a Pack File

A pack file is a JSON file that describes multiple assets to load at once. Useful for organizing asset manifests.

```js
preload() {
    this.load.pack('pack1', 'assets/pack.json');
}
```

Pack file format:

```json
{
    "section1": {
        "baseURL": "assets/",
        "files": [
            { "type": "image", "key": "bg", "url": "bg.png" },
            { "type": "atlas", "key": "chars", "textureURL": "chars.png", "atlasURL": "chars.json" }
        ]
    }
}
```

### Loading with a Progress Bar

```js
preload() {
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(240, 270, 320, 50);

    this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(0xffffff, 1);
        progressBar.fillRect(250, 280, 300 * value, 30);
    });

    this.load.on('complete', () => {
        progressBar.destroy();
        progressBox.destroy();
    });

    // Queue your assets
    this.load.image('sky', 'assets/sky.png');
    // ... more assets
}
```

## All File Types Reference

Every method below is called on `this.load` within a Scene.

| Method | Registered Name | Parameters | Description |
|---|---|---|---|
| `image(key, url, xhrSettings)` | `image` | key: string/config, url: string/string[], xhr | Loads an image. URL array `[texture, normalMap]` for normal maps. Default ext: `.png` |
| `spritesheet(key, url, frameConfig, xhrSettings)` | `spritesheet` | key, url, frameConfig: `{ frameWidth, frameHeight, startFrame, endFrame, margin, spacing }`, xhr | Loads a fixed-frame sprite sheet image |
| `atlas(key, textureURL, atlasURL, textureXhr, atlasXhr)` | `atlas` | key, textureURL, atlasURL, xhr, xhr | JSON texture atlas (TexturePacker JSON Hash/Array) |
| `atlasXML(key, textureURL, atlasURL, textureXhr, atlasXhr)` | `atlasXML` | key, textureURL, atlasURL, xhr, xhr | XML texture atlas (Starling/Sparrow format) |
| `multiatlas(key, atlasURL, path, baseURL, atlasXhr)` | `multiatlas` | key, atlasURL, path, baseURL, xhr | Multi-texture atlas (single JSON, multiple images) |
| `unityAtlas(key, textureURL, atlasURL, textureXhr, atlasXhr)` | `unityAtlas` | key, textureURL, atlasURL, xhr, xhr | Unity texture atlas format |
| `aseprite(key, textureURL, atlasURL, textureXhr, atlasXhr)` | `aseprite` | key, textureURL, atlasURL, xhr, xhr | Aseprite animation atlas |
| `audio(key, urls, config, xhrSettings)` | `audio` | key, urls (string/string[]), config `{ instances }`, xhr | Audio file(s). Provide array for format fallback |
| `audioSprite(key, jsonURL, audioURL, audioConfig, audioXhr, jsonXhr)` | `audioSprite` | key, jsonURL, audioURL, audioConfig, xhr, xhr | Audio sprite: single audio file + JSON marker data |
| `video(key, urls, noAudio)` | `video` | key, urls (string/string[]), noAudio: bool | Video file. Set `noAudio: true` to skip audio track |
| `json(key, url, dataKey, xhrSettings)` | `json` | key, url, dataKey: string, xhr | JSON data. `dataKey` extracts a sub-property |
| `xml(key, url, xhrSettings)` | `xml` | key, url, xhr | XML document |
| `text(key, url, xhrSettings)` | `text` | key, url, xhr | Plain text file |
| `binary(key, url, dataType, xhrSettings)` | `binary` | key, url, dataType: typed array constructor, xhr | Binary/ArrayBuffer data |
| `html(key, url, xhrSettings)` | `html` | key, url, xhr | HTML content as string |
| `htmlTexture(key, url, width, height, xhrSettings)` | `htmlTexture` | key, url, width, height, xhr | HTML content rendered to a texture |
| `css(key, url, xhrSettings)` | `css` | key, url, xhr | CSS file (injected into DOM) |
| `glsl(key, url, xhrSettings)` | `glsl` | key, url, xhr | GLSL shader source file |
| `svg(key, url, svgConfig, xhrSettings)` | `svg` | key, url, svgConfig: `{ width, height, scale }`, xhr | SVG rasterized to a texture |
| `bitmapFont(key, textureURL, fontDataURL, textureXhr, fontDataXhr)` | `bitmapFont` | key, textureURL, fontDataURL, xhr, xhr | Bitmap font (texture + XML/JSON font data) |
| `font(key, url, format, descriptors, xhrSettings)` | `font` | key, url, format (default `'truetype'`), descriptors: object, xhr | Web font file (ttf/otf/woff/woff2) via FontFace API |
| `tilemapTiledJSON(key, url, xhrSettings)` | `tilemapTiledJSON` | key, url, xhr | Tiled JSON tilemap |
| `tilemapCSV(key, url, xhrSettings)` | `tilemapCSV` | key, url, xhr | CSV tilemap |
| `tilemapImpact(key, url, xhrSettings)` | `tilemapImpact` | key, url, xhr | Impact.js tilemap |
| `animation(key, url, dataKey, xhrSettings)` | `animation` | key, url, dataKey, xhr | Animation JSON data (auto-added to AnimationManager) |
| `pack(key, url, dataKey, xhrSettings)` | `pack` | key, url, dataKey, xhr | Pack file (JSON manifest of other files to load) |
| `script(key, url, type, xhrSettings)` | `script` | key, url, type (DOM element type attr), xhr | JavaScript file (injected as script tag) |
| `scripts(key, url, xhrSettings)` | `scripts` | key, url (string[]), xhr | Multiple scripts loaded in order |
| `plugin(key, url, start, mapping, xhrSettings)` | `plugin` | key, url, start: bool, mapping: string, xhr | Phaser plugin JS file |
| `scenePlugin(key, url, systemKey, sceneKey, xhrSettings)` | `scenePlugin` | key, url, systemKey, sceneKey, xhr | Phaser scene plugin JS file |
| `sceneFile(key, url, xhrSettings)` | `sceneFile` | key, url, xhr | External Scene JS file |
| `texture(key, url, xhrSettings)` | `texture` | key, url (compressed texture config), xhr | Compressed texture with format fallbacks (since 3.60) |

All methods accept either positional arguments or a single config object as the first argument. All methods also accept an array of config objects as the first argument to batch-load multiple files of the same type.

## Events

All events are emitted on the Loader instance (`this.load`).

| Event String | Callback Signature | Description |
|---|---|---|
| `'addfile'` | `(key, type, loader, file)` | A file was added to the load queue |
| `'start'` | `(loader)` | Loader has started. Progress is zero |
| `'load'` | `(file)` | A single file finished loading (before processing/caching) |
| `'fileprogress'` | `(file, percentComplete)` | Per-file download progress (0-1). Only fires if browser provides `lengthComputable` |
| `'progress'` | `(value)` | Overall load progress updated (0-1) |
| `'postprocess'` | `(loader)` | All files loaded and processed, before internal cleanup |
| `'filecomplete'` | `(key, type, data)` | Any file finished loading and processing |
| `'filecomplete-{type}-{key}'` | `(key, type, data)` | Specific file finished (e.g., `'filecomplete-image-hero'`) |
| `'loaderror'` | `(file)` | A file failed to load |
| `'complete'` | `(loader, totalComplete, totalFailed)` | All files in the queue are done |

### Event Lifecycle Order

1. `'start'` - Loader begins
2. `'fileprogress'` - Per-file progress (repeats per file, if available)
3. `'load'` - Each file finishes downloading
4. `'filecomplete-{type}-{key}'` - Specific file processed and cached
5. `'filecomplete'` - Generic per-file completion
6. `'progress'` - Overall progress updated
7. `'postprocess'` - All files done, before cleanup
8. `'complete'` - Everything finished

## Gotchas and Common Mistakes

**Keys must be unique within their type.** Loading a second image with the same key as an existing one will log a warning and skip it. Remove the old texture from the Texture Manager first if you need to replace it.

**Sprite sheet is not the same as an atlas.** Use `spritesheet()` for fixed-size grids of frames (referenced by index). Use `atlas()` for packed texture atlases with named frames.

**Forgetting `this.load.start()` outside preload.** If you call load methods in `create()` or later, the Loader does not auto-start. You must call `this.load.start()` manually.

**Path must end with `/`.** If you call `this.load.setPath()` it will append the slash automatically. If you set `this.load.path` directly, you must include the trailing slash yourself.

**Audio format fallbacks.** Always provide multiple audio formats (OGG + MP3 at minimum) for cross-browser support. The Loader picks the first format the browser supports.

**Pack files can override baseURL/path/prefix.** Each section in a pack file can set its own `baseURL`, `path`, and `prefix` values. These apply only to files within that section and are restored after the section is processed.

**File keys include the prefix.** If you set `this.load.setPrefix('MENU.')` and load an image with key `'bg'`, the actual cache key becomes `'MENU.bg'`. You must use that full key when referencing the asset.

**The `maxRetries` property (default: 2)** controls how many times the Loader retries a failed file before giving up. This is set per-file at creation time based on `this.load.maxRetries`. Adjusting it after files are added has no effect on those files.

**Image load type.** By default images load via XHR (as blobs). Set `imageLoadType: 'HTMLImageElement'` in the loader config to use `<img>` tag loading instead, which can help with CORS issues in some environments.

**Local file schemes.** The Loader recognizes `file://` and `capacitor://` as local schemes by default (via `localSchemes`). Files loaded from local schemes skip CORS headers.

**Cross-origin.** Set `crossOrigin: 'anonymous'` in the loader config (or via `this.load.setCORS('anonymous')`) when loading assets from a different domain, especially if those textures will be used with WebGL.

## Source File Map

| File | Purpose |
|---|---|
| `src/loader/LoaderPlugin.js` | Main Loader class, accessed as `this.load`. Manages queue, parallel downloads, events |
| `src/loader/File.js` | Base File class. All file types extend this |
| `src/loader/filetypes/ImageFile.js` | `this.load.image()` |
| `src/loader/filetypes/SpriteSheetFile.js` | `this.load.spritesheet()` |
| `src/loader/filetypes/AtlasJSONFile.js` | `this.load.atlas()` |
| `src/loader/filetypes/AtlasXMLFile.js` | `this.load.atlasXML()` |
| `src/loader/filetypes/MultiAtlasFile.js` | `this.load.multiatlas()` |
| `src/loader/filetypes/UnityAtlasFile.js` | `this.load.unityAtlas()` |
| `src/loader/filetypes/AsepriteFile.js` | `this.load.aseprite()` |
| `src/loader/filetypes/AudioFile.js` | `this.load.audio()` |
| `src/loader/filetypes/AudioSpriteFile.js` | `this.load.audioSprite()` |
| `src/loader/filetypes/VideoFile.js` | `this.load.video()` |
| `src/loader/filetypes/JSONFile.js` | `this.load.json()` |
| `src/loader/filetypes/XMLFile.js` | `this.load.xml()` |
| `src/loader/filetypes/TextFile.js` | `this.load.text()` |
| `src/loader/filetypes/BinaryFile.js` | `this.load.binary()` |
| `src/loader/filetypes/HTMLFile.js` | `this.load.html()` |
| `src/loader/filetypes/HTMLTextureFile.js` | `this.load.htmlTexture()` |
| `src/loader/filetypes/CSSFile.js` | `this.load.css()` |
| `src/loader/filetypes/GLSLFile.js` | `this.load.glsl()` |
| `src/loader/filetypes/SVGFile.js` | `this.load.svg()` |
| `src/loader/filetypes/BitmapFontFile.js` | `this.load.bitmapFont()` |
| `src/loader/filetypes/FontFile.js` | `this.load.font()` |
| `src/loader/filetypes/TilemapJSONFile.js` | `this.load.tilemapTiledJSON()` |
| `src/loader/filetypes/TilemapCSVFile.js` | `this.load.tilemapCSV()` |
| `src/loader/filetypes/TilemapImpactFile.js` | `this.load.tilemapImpact()` |
| `src/loader/filetypes/AnimationJSONFile.js` | `this.load.animation()` |
| `src/loader/filetypes/PackFile.js` | `this.load.pack()` |
| `src/loader/filetypes/ScriptFile.js` | `this.load.script()` |
| `src/loader/filetypes/MultiScriptFile.js` | `this.load.scripts()` |
| `src/loader/filetypes/PluginFile.js` | `this.load.plugin()` |
| `src/loader/filetypes/ScenePluginFile.js` | `this.load.scenePlugin()` |
| `src/loader/filetypes/SceneFile.js` | `this.load.sceneFile()` |
| `src/loader/filetypes/CompressedTextureFile.js` | `this.load.texture()` |
| `src/loader/filetypes/HTML5AudioFile.js` | Internal: HTML5 Audio element loading (used by AudioFile) |
| `src/loader/events/` | All loader event constants |
