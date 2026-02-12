/**
 * @author       Benjamin D. Richards <benjamindrichards@gmail.com>
 * @copyright    2013-2026 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

var Circular = require('../math/easing/circular');
var Linear = require('../math/Linear');
var Class = require('../utils/Class');
var Color = require('./color/Color');
var Interpolate = require('./color/Interpolate');

/**
 * @classdesc
 * The ColorBand class represents a transition from one color to another.
 * It is used in a {@see Phaser.Display.ColorRamp}, and forms the basis
 * of a {@see Phaser.GameObjects.Gradient}.
 *
 * ColorBand can control the transition by setting a middle point,
 * a color space for blending, and an interpolation style.
 *
 * This class also records `start` and `end` points for use in a ramp.
 * These indicate its position within the ramp.
 *
 * Colors are handled unpremultiplied, so RGB values may be larger than alpha.
 *
 * @class ColorBand
 * @memberof Phaser.Display
 * @since 4.0.0
 * @constructor
 *
 * @param {Phaser.Types.Display.ColorBandConfig} [config] - The configuration to use for the band.
 */
var ColorBand = new Class({
    initialize: function ColorBand (config)
    {
        if (!config) { config = {}; }

        /**
         * Identifies this object as a ColorBand.
         * Please don't change this.
         *
         * @name Phaser.Display.ColorBand#isColorBand
         * @type {boolean}
         * @since 4.0.0
         * @default true
         * @readonly
         */
        this.isColorBand = true;

        /**
         * The color at the start of the color band.
         *
         * @name Phaser.Display.ColorBand#colorStart
         * @type {Phaser.Display.Color}
         * @since 4.0.0
         */
        this.colorStart = new Color();

        /**
         * The color at the end of the color band.
         *
         * @name Phaser.Display.ColorBand#colorEnd
         * @type {Phaser.Display.Color}
         * @since 4.0.0
         */
        this.colorEnd = new Color();

        /**
         * The start point of this band within a ColorRamp.
         * This value should be normalized within the ramp,
         * between 0 (ramp start) and 1 (ramp end).
         *
         * @name Phaser.Display.ColorBand#start
         * @type {Phaser.Display.Color}
         * @since 4.0.0
         */
        this.start = config.start || 0;

        /**
         * The middle point of this band within a ColorRamp.
         * This value should be normalized within the band,
         * between 0 (band start) and 1 (band end).
         * Middle point alters the shape of the color interpolation.
         *
         * Mathematically, the gradient should be 0.5 at the middle.
         * We use a gamma curve to adjust the gradient.
         * Thus, `0.5 = middle^gamma`.
         * By the properties of logarithms, therefore,
         * `gamma = log base middle of 0.5`.
         *
         * @name Phaser.Display.ColorBand#middle
         * @type {Phaser.Display.Color}
         * @since 4.0.0
         */
        this.middle = (config.middle === undefined) ? 0.5 : config.middle;

        /**
         * The end point of this band within a ColorRamp.
         * This value should be normalized within the ramp,
         * between 0 (ramp start) and 1 (ramp end).
         *
         * @name Phaser.Display.ColorBand#end
         * @type {Phaser.Display.Color}
         * @since 4.0.0
         */
        this.end = 1;
        if (config.end !== undefined) { this.end = config.end; }
        else if (config.size !== undefined) { this.end = this.start + config.size; }

        /**
         * The color interpolation.
         * This can be one of the following codes:
         *
         * - 0: LINEAR - a straight blend.
         * - 1: CURVED - color changes quickly at start and end,
         *   flattening in the middle. Good for convex surfaces.
         * - 2: SINUSOIDAL - color changes quickly in the middle,
         *   flattening at start and end. Good for smooth transitions.
         * - 3: CURVE_START - color changes quickly at the start,
         *   flattening at the end.
         * - 4: CURVE_END - color changes quickly at the end,
         *   flattening at the start.
         *
         * Under the hood, these are similar to the circular easing function.
         *
         * @name Phaser.Display.ColorBand#interpolation
         * @type {number}
         * @default 0
         * @since 4.0.0
         */
        this.interpolation = config.interpolation || 0;

        /**
         * The color space where interpolation should be done.
         * This can be one of the following codes:
         *
         * - 0: RGBA - channels are blended directly.
         *   This can be inaccurate.
         * - 1: HSVA_NEAREST - colors are blended in HSVA space,
         *   better preserving saturation and lightness.
         *   The hue is blended with the shortest angle, e.g. red and blue
         *   blend via purple, not green.
         * - 2: HSVA_PLUS - as HSVA_NEAREST, but hue angle always increases.
         * - 3: HSVA_MINUS - as HSVA_NEAREST, but hue angle always decreases.
         *
         * @name Phaser.Display.ColorBand#colorSpace
         * @type {number}
         * @default 0
         * @since 4.0.0
         */
        this.colorSpace = config.colorSpace || 0;

        this.setColors(config.colorStart, config.colorEnd);
    },

    /**
     * Set the colors of the band, from a variety of color formats.
     *
     * - A number is expected to be a 24 or 32 bit RGB or ARGB value.
     * - A string is expected to be a hex code.
     * - An array of numbers is expected to be RGB or RGBA in the range 0-1.
     * - A Color object can be used.
     *
     * @method Phaser.Display.ColorBand#setColors
     * @since 4.0.0
     * @param {number | string | number[] | Color} [start=0x000000] - The color at the start of the band.
     * @param {number | string | number[] | Color} [end] - The color at the end of the band. If not specified, equals `start`.
     * @returns {this} This ColorBand.
     */
    setColors: function (start, end)
    {
        var alpha;

        if (start === undefined)
        {
            start = 0x000000;
        }
        if (end === undefined)
        {
            end = start;
        }

        if (typeof start === 'number')
        {
            Color.IntegerToColor(start, this.colorStart);
        }
        else if (typeof start === 'string')
        {
            Color.HexStringToColor(start, this.colorStart);
        }
        else if (Array.isArray(start))
        {
            alpha = (start[3] === undefined) ? 1 : start[3];
            this.colorStart.setGLTo(start[0], start[1], start[2], alpha);
        }
        else if (start instanceof Color)
        {
            this.colorStart.setTo(start.red, start.green, start.blue, start.alpha);
        }

        if (typeof end === 'number')
        {
            Color.IntegerToColor(end, this.colorEnd);
        }
        else if (typeof end === 'string')
        {
            Color.HexStringToColor(end, this.colorEnd);
        }
        else if (Array.isArray(end))
        {
            alpha = (end[3] === undefined) ? 1 : end[3];
            this.colorEnd.setGLTo(end[0], end[1], end[2], alpha);
        }
        else if (end instanceof Color)
        {
            this.colorEnd.setTo(end.red, end.green, end.blue, end.alpha);
        }

        return this;
    },

    /**
     * Get the color at a given index within this band.
     *
     * @method Phaser.Display.ColorBand#getColor
     * @since 4.0.0
     * @param {number} index - The index at which to get the color, from 0 to 1.
     * @returns {Phaser.Types.Display.ColorObject} The color at that index.
     */
    getColor: function (index)
    {
        // Apply middle gamma curve.
        var gamma = Math.log(0.5) / Math.log(this.middle);
        index = Math.pow(index, gamma);
        index = Math.min(Math.max(0, index), 1);

        // Apply interpolation mode.
        switch (this.interpolation)
        {
            case 1:
            {
                // CURVED
                if ((index *= 2) < 1)
                {
                    return 0.5 * Math.sqrt(1 - (--index * index));
                }
                index = 1 - index;
                index = 1 - 0.5 * Math.sqrt(1 - index * index);
                break;
            }
            case 2:
            {
                // SINUSOIDAL or circular
                index = Circular.InOut(index);
                break;
            }
            case 3:
            {
                // CURVE_START
                index = Circular.Out(index);
                break;
            }
            case 4:
            {
                // CURVE_END
                index = Circular.In(index);
                break;
            }
        }

        var hsvSign = 0;
        if (this.colorSpace === 2) { hsvSign = 1; }
        else if (this.colorSpace === 3) { hsvSign = -1; }
        var outColor = Interpolate.ColorWithColor(
            this.colorStart,
            this.colorEnd,
            1,
            index,
            this.colorSpace !== 0, // Use HSV?
            hsvSign
        );
        outColor.a = Linear(this.colorStart.alpha, this.colorEnd.alpha, index);
        return outColor;
    }
});

module.exports = ColorBand;
