export class DebugPanel {
  constructor(root = document) {
    this.host = root.createElement("aside");
    this.host.id = "pathfinder-iq-reader";
    this.host.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:2147483647;width:300px;max-height:45vh;overflow:auto;background:#101820;color:#e8f1f2;border:1px solid #38bdf8;border-radius:8px;padding:10px;font:12px/1.4 monospace;box-shadow:0 4px 18px #0008";
    root.documentElement.append(this.host);
  }

  render(snapshot) {
    this.host.replaceChildren();
    const heading = document.createElement("strong");
    heading.textContent = `Pathfinder IQ Reader — ${snapshot.status.toUpperCase()}`;
    const output = document.createElement("pre");
    output.style.cssText = "white-space:pre-wrap;margin:8px 0 0";
    output.textContent = JSON.stringify(snapshot, null, 2);
    this.host.append(heading, output);
  }
}
