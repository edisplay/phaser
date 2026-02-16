/**
 * @author       Benjamin D. Richards <benjamindrichards@gmail.com>
 * @copyright    2013-2026 Phaser Studio Inc.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

var DESTROY_EVENT = require('../cameras/2d/events/DESTROY_EVENT');
var BlendModes = require('../renderer/BlendModes');
var DESTROY = require('../gameobjects/events/DESTROY_EVENT');
var GameObject = require('../gameobjects/GameObject');
var UUID = require('../utils/string/UUID');

/**
 * Adds a Shine effect to a Camera or GameObject.
 *
 * Shine simulates a highlight glancing from a surface.
 * It's a brief specular reflection of a bright light,
 * typically from a fairly flat surface which only reflects the highlight
 * from certain angles.
 * In a game, you might use this to highlight an important object,
 * convey a sense of glossiness,
 * or move an interference band across a transmission.
 *
 * This Action works by creating several resources.
 *
 * - A Gradient object generates the region of the shine.
 * - A DynamicTexture holds the shine region.
 * - A Tween animates the shine region.
 * - A Blend filter combines the shine and the image.
 * - (Optional) A ParallelFilters filter adds the rest of the image back in.
 *
 * You may configure the effect in several ways using the `config` parameter.
 *
 * Use `radius`, `direction` and `scale` to set the gradient orientation.
 * Scale defaults to 2, twice the size of the target,
 * to guarantee that the highlight leaves the image completely before repeating.
 * The radius also adds an extra offset on either side of the image
 * so the gradient has space to enter and exit the image.
 *
 * Use `colorFactor` to control the RGBA color of the highlight.
 * You can overdrive this to values greater than 1 to create very bright shine.
 * By default, it has a slight red tint to create warm highlights.
 *
 * Use `displacementMap` and `displacement` to add a Displacement filter
 * to the Gradient. This creates the impression of a slightly scuffed surface.
 * You may add other filters to the Gradient; they will be rendered into the
 * DynamicTexture for use in the final blend.
 *
 * Use `reveal` to put the effect into reveal mode.
 * In this mode, the image is only visible under the shine.
 *
 * Use `duration`, `yoyo` and `ease` to control the Tween animation.
 *
 * The resources created in this way will be automatically destroyed
 * when the target is destroyed. You may remove them earlier yourself.
 * Unless you use them in other systems, they are isolated and safe to destroy.
 * (The Tween requires the other resources to exist while it exists.)
 *
 * You can create your own Shine effects using this as a base or as inspiration.
 *
 * @example
 * // Slowly move a blueish highlight up and down an image.
 * // Use a displacement map to dirty up the highlight.
 * const { dynamicTexture, gradient, tween } = Phaser.Actions.AddEffectShine(this.image, {
 *     duration: 5000,
 *     direction: Math.PI / 2,
 *     scale: 1,
 *     displacementMap: 'displace',
 *     colorFactor: [ 0.5,2,2,1 ],
 *     yoyo: true,
 *     ease: 'Quad.inout'
 * });
 *
 * @function Phaser.Actions.AddEffectShine
 * @since 4.0.0
 *
 * @param {Phaser.Cameras.Scene2D.Camera|Phaser.GameObjects.GameObject} target - Recipient of the Shine effect
 * @param {Phaser.Types.Actions.AddEffectShineConfig} [config] - Initial configuration of the Shine effect.
 *
 * @return {Phaser.Types.Actions.AddEffectShineReturn} An object containing the resources which were created.
 */
var AddEffectShine = function (target, config)
{
    if (!config) { config = {}; }

    // Enable filters on target.
    if (target instanceof GameObject)
    {
        target.enableFilters();
    }

    var gradientDirection = config.direction === undefined ? 0.5 : config.direction % (Math.PI * 2);
    var gradientScale = config.scale === undefined ? 2 : config.scale;
    var gradientRadius = (config.radius || 0.5) / gradientScale;
    var gradientWidth = config.width || target.width || 128;
    var gradientHeight = config.height || target.height || 128;
    var start = { x: 0, y: 0 };
    if (gradientDirection < 1) { gradientDirection += Math.PI * 2; }
    if (gradientDirection > Math.PI * 3 / 2)
    {
        // Bottom-left start
        start.y = 1;
    }
    else if (gradientDirection > Math.PI)
    {
        // Bottom-right start
        start.x = 1;
        start.y = 1;
    }
    else if (gradientDirection > Math.PI / 2)
    {
        // Top-right start
        start.x = 1;
    }

    // Create Gradient object.
    var gradientConfig = {
        origin: 0,
        width: gradientWidth,
        height: gradientHeight,
        config: {
            offset: -gradientRadius,
            repeatMode: 3, // Triangular
            shapeMode: 0, // Linear
            direction: gradientDirection,
            length: gradientScale,
            start: start,
            bands: config.bands || [
                {
                    interpolation: 2, // Sinusoidal for smooth transitions
                    colorStart: 0xffffff,
                    colorEnd: [ 1, 1, 1, 0 ],
                    size: gradientRadius
                },
                {
                    colorStart: [ 1, 1, 1, 0 ],
                    size: 1 - gradientRadius
                }
            ]
        }
    };
    var gradient = target.scene.make.gradient(gradientConfig, false);

    // Create displacement effect.
    if (config.displacementMap)
    {
        var displacement = config.displacement || 0.1;
        gradient.enableFilters().filters.internal.addDisplacement(config.displacementMap, displacement, displacement);
    }

    // Create DynamicTexture.
    var key = UUID();
    var textures = target.scene.textures;
    while (textures.exists(key))
    {
        key = UUID();
    }
    var dynamicTexture = textures.addDynamicTexture(key, gradient.width, gradient.height);

    // Create Tween.
    var tween = target.scene.tweens.add({
        targets: gradient,
        offset: 1 + gradientRadius,
        repeat: -1,
        yoyo: !!config.yoyo,
        ease: config.ease,
        duration: config.duration || 2000,
        repeatDelay: config.repeatDelay || 0,
        onUpdate: function ()
        {
            dynamicTexture.clear().draw(gradient).render();
        }
    });

    // Combine gradient texture with target.
    var filterList = config.useExternal ? target.filters.external : target.filters.internal;
    var blendFilter;
    var parallelFilters;
    var colorFactor = config.colorFactor || [ 1.15, 0.85, 0.85, 1 ];
    if (!config.reveal)
    {
        parallelFilters = filterList.addParallelFilters();
        blendFilter = parallelFilters.top.addBlend(key, BlendModes.MULTIPLY, 1, colorFactor);
        parallelFilters.blend.blendMode = BlendModes.ADD;
    }
    else
    {
        blendFilter = filterList.addBlend(key, BlendModes.MULTIPLY, 1, colorFactor);
    }

    // Set up tidy-up.
    // Gradient is only referenced from the tween, and will self-dispose.
    // Filters will self-dispose.
    // Tween and dynamic texture must be removed if the target is destroyed.
    var tidyup = function ()
    {
        tween.destroy();
        dynamicTexture.destroy();
    };
    if (target instanceof GameObject)
    {
        target.on(DESTROY, tidyup);
    }
    else
    {
        target.on(DESTROY_EVENT, tidyup);
    }

    // Return relevant objects.
    return {
        dynamicTexture: dynamicTexture,
        gradient: gradient,
        tween: tween,
        parallelFilters: parallelFilters,
        blendFilter: blendFilter
    };
};

module.exports = AddEffectShine;
