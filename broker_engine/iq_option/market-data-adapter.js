import { MarketDataProvider } from "../../market_engine/market-data-provider.js";
import {
  createUnavailableSnapshot,
  normalizeSnapshot,
} from "../../browser/iq-option-reader/normalized-market-data.js";

/**
 * Read-only boundary between an IQ Option collector and the Market Engine.
 * V1 deliberately has no transport and no order/trade methods.
 */
export class IqOptionMarketDataAdapter extends MarketDataProvider {
  #snapshot = createUnavailableSnapshot();

  ingest(candidate, receivedAt = Date.now()) {
    this.#snapshot = normalizeSnapshot(candidate, receivedAt);
    return this.#snapshot;
  }

  getSnapshot() {
    return this.#snapshot;
  }
}
