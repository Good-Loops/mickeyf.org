/**
 * Represents a color with hue, saturation, and lightness values.
 */
export type color = {
    /**
     * The hue of the color.
     */
    hue: number;

    /**
     * The saturation of the color.
     */
    saturation: number;

    /**
     * The lightness of the color.
     */
    lightness: number;
};

/**
 * Configuration for drawing shapes.
 */
export type drawConfig = {
    /**
     * The width of the shape.
     */
    width: number;

    /**
     * The radius of the shape.
     */
    radius: number;
};
