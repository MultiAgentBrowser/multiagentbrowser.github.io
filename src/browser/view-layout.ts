export interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ViewLayout {
  // Top toolbar height: 42px (tab title bar) + 46px (navigation bar) = 88px
  public static readonly TOP_NAV_HEIGHT = 88;
  // Bottom status bar height: 28px
  public static readonly STATUS_BAR_HEIGHT = 28;

  /**
   * Calculates the exact WebContentsView viewport dimensions for a given window size.
   */
  public static calculateViewportBounds(
    windowWidth: number,
    windowHeight: number
  ): ViewBounds {
    const x = 0;
    const y = this.TOP_NAV_HEIGHT;
    const width = Math.max(0, windowWidth);
    const height = Math.max(0, windowHeight - this.TOP_NAV_HEIGHT - this.STATUS_BAR_HEIGHT);

    return { x, y, width, height };
  }
}

