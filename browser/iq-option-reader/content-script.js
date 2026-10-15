import { IqOptionTraderoomCollector } from "./collector.js";
import { DebugPanel } from "./debug-panel.js";

const collector = new IqOptionTraderoomCollector();
const panel = new DebugPanel();
const update = () => panel.render(collector.collect());

update();
setInterval(update, 1000);
