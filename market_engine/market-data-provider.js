/** Interface documentation for broker market-data providers. */
export class MarketDataProvider {
  /** @returns {Readonly<object>} the latest normalized snapshot */
  getSnapshot() {
    throw new Error("MarketDataProvider.getSnapshot must be implemented");
  }
}
