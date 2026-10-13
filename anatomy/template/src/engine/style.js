// The `ax` theme for the Anatomy kit: navy with one accent. Other colours only on things that really are
// coloured (laundry, money, an awning), by overriding the tokens on the object's class, so four-tone shading still works.
const tint = (cls, top, s0, s1, s2, s3, hi, lo, faint) =>
  `.${cls}{--anatomy-top:${top};--anatomy-shade-0:${s0};--anatomy-shade-1:${s1};--anatomy-shade-2:${s2};--anatomy-shade-3:${s3};--anatomy-hi:${hi};--anatomy-lo:${lo};--anatomy-faint:${faint};--anatomy-paper:${s1}}`;

const BASE = `
.iso[data-theme="ax"]{
  --anatomy-page:#070910;--anatomy-card:#0d1220;--anatomy-text:#97a1b8;--anatomy-strong:#eef2fb;--anatomy-muted:#5e6880;
  --anatomy-paper:#141b2e;--anatomy-face:#1f2943;--anatomy-top:#26324f;
  --anatomy-shade-0:#121828;--anatomy-shade-1:#172036;--anatomy-shade-2:#1c2640;--anatomy-shade-3:#222d4a;
  --anatomy-lit-top:#163f52;--anatomy-lit-shade:#0f3242;
  --anatomy-hi:#e3eaf7;--anatomy-mid:#8593b3;--anatomy-lo:#4a5676;--anatomy-faint:#323d5a;--anatomy-lit:#7fe3f5;
  --anatomy-halo:#03050a;--anatomy-halo-opacity:.85;--anatomy-dot:#c9d4ea;
}
.ax-well{fill:var(--anatomy-shade-1)}
.ax-lcd{fill:#06222b}
.ax-lcd-text{fill:#5fe0f5;font-family:var(--anatomy-mono);font-weight:600}
.ax-wall{fill:var(--anatomy-shade-2)}
.ax-drum{fill:#1b2438}
.ax-holes{stroke:#0b101c;stroke-width:1.1;stroke-linecap:round;fill:none}
.ax-paddle{fill:#2a3550;stroke:var(--anatomy-lo);stroke-width:.4}
.ax-cloth-a{fill:#3d6fd8;stroke:#1b2c55;stroke-width:.4}
.ax-cloth-b{fill:#e8edf7;stroke:#5e6a85;stroke-width:.4}
.ax-cloth-c{fill:#0ea5c6;stroke:#075566;stroke-width:.4}
.ax-glass{fill:#7fd9ec;opacity:.14}
.ax-sheen{fill:none;stroke:#fff;stroke-width:1.2;stroke-linecap:round;opacity:.55}
${tint("ax-towel-a", "#bfe9f2", "#6fb6c6", "#7ec2d1", "#8dcddb", "#9dd7e3", "#2c5966", "#3c7887", "#5aa0b0")}
${tint("ax-towel-b", "#f2f5fb", "#a9b3c7", "#b8c1d3", "#c6cedd", "#d4dae6", "#3b465e", "#6b7690", "#9aa5bb")}
${tint("ax-wood", "#2c3758", "#1b2236", "#20283f", "#252e48", "#2a3452", "#c9d4ea", "#55627f", "#3a4664")}
${tint("ax-leaf", "#d9e2f2", "#8f9bb5", "#9ea9c1", "#adb7cd", "#bcc5d8", "#2f3a52", "#66728d", "#93a0bb")}
${tint("ax-paper", "#f6f8fc", "#b9c2d4", "#c6cede", "#d2d9e6", "#dee3ed", "#38435c", "#7b869f", "#a7b1c6")}
${tint("ax-bill", "#9fe0bd", "#4f9a74", "#5aa780", "#66b38b", "#72bf97", "#1f4a35", "#2f6a4d", "#4f8f6e")}
${tint("ax-amber", "#ffd27a", "#b5832a", "#c28f34", "#cf9b3e", "#dca848", "#5a3f0c", "#8a6420", "#b08640")}
${tint("ax-bag-blue", "#9dbcff", "#4a6fc0", "#5279cb", "#5b84d6", "#6590e0", "#1c2f5c", "#33508f", "#5b79b8")}
${tint("ax-bag-violet", "#cdb8ff", "#7a62c4", "#846dce", "#8f78d8", "#9a84e1", "#33285c", "#53439a", "#7a69bd")}
${tint("ax-bag-rose", "#ffb8c4", "#c25a6c", "#cc6577", "#d67082", "#df7c8d", "#5a1f2a", "#923a4a", "#b85a6a")}
${tint("ax-bag-green", "#a6ecc8", "#4c9f78", "#56ab83", "#61b68e", "#6cc199", "#1d4a35", "#2f6c4f", "#4c9172")}
${tint("ax-cover", "#d7e3f5", "#8996b1", "#97a4be", "#a5b1ca", "#b3bfd6", "#2d3850", "#5f6b86", "#8f9bb6")}
${tint("ax-bldg", "#2e3a5c", "#1a2236", "#1f283f", "#242e49", "#2a3553", "#cfd8ea", "#56627f", "#3a4664")}
${tint("ax-awning", "#3fd0ea", "#0b7d96", "#0c88a2", "#0e93ae", "#119fbb", "#06343f", "#08566a", "#0b7a92")}
${tint("ax-sign", "#f2f5fb", "#a9b3c7", "#b8c1d3", "#c6cedd", "#d4dae6", "#0b6d83", "#6b7690", "#9aa5bb")}
${tint("ax-scooter", "#f2f5fb", "#9aa5bb", "#a9b3c7", "#b8c1d3", "#c6cedd", "#2b3550", "#5f6b86", "#8f9bb6")}
${tint("ax-seat", "#3a4664", "#1a2236", "#20283f", "#262f49", "#2c3653", "#c9d4ea", "#4a5676", "#323d5a")}
${tint("ax-box", "#3fd0ea", "#0b7d96", "#0c88a2", "#0e93ae", "#119fbb", "#e9fbff", "#08566a", "#0b7a92")}
${tint("ax-jacket", "#5b84d6", "#2c4785", "#33508f", "#3a5999", "#4162a3", "#dfe8fb", "#203763", "#2e4a82")}
${tint("ax-helmet", "#f2f5fb", "#9aa5bb", "#a9b3c7", "#b8c1d3", "#c6cedd", "#2b3550", "#5f6b86", "#8f9bb6")}
${tint("ax-visor", "#203048", "#0d1424", "#111a2c", "#152034", "#19263c", "#7fd9ec", "#2a3a5a", "#203048")}
${tint("ax-tyre", "#1a2030", "#0b0f1a", "#0e1320", "#111826", "#141c2c", "#8593b3", "#2a3349", "#1f2738")}
${tint("ax-pin", "#7fe3f5", "#0b7d96", "#0c88a2", "#0e93ae", "#119fbb", "#e9fbff", "#08566a", "#0b7a92")}
${tint("ax-pin-dot", "#ffffff", "#c9d4ea", "#d4dceb", "#dfe5f0", "#eaeef5", "#0b6d83", "#9aa5bb", "#c9d4ea")}
${tint("ax-trunk", "#5a4636", "#3a2d22", "#413227", "#48382c", "#4f3e31", "#c9b6a4", "#6e5a49", "#5a4838")}
${tint("ax-leaf-g", "#7fd3a6", "#2f7a55", "#36865e", "#3e9268", "#469e72", "#123a26", "#25603f", "#3b8160")}
.ax-ink{stroke:#5d6a86}
.ax-bill-line{stroke:#2f6a4d}
.ax-tag{fill:#ffffff;stroke:#0b6d83;stroke-width:.35}
.ax-tag-qr{fill:#0b3a47}
.ax-tag-hole{fill:#0b6d83}
.ax-screen{fill:#0a1222}
.ax-screen-off{fill:#151b28}
.ax-row{fill:#1c2740}
.ax-panel{fill:#111a2e}
.ax-map{fill:#13243a}
.ax-route{fill:none;stroke:#0ea5c6;stroke-width:.9;stroke-dasharray:1.2 1.2}
.ax-bar{fill:#3d6fd8}
.ax-bar-hi{fill:#0ea5c6}
.ax-live{fill:#5fe0f5}
.ax-dot-0{fill:#5b8cff}.ax-dot-1{fill:#a78bfa}.ax-dot-2{fill:#34d399}
.ax-logo-bg{fill:#0ea5c6}
.ax-screen-text{fill:#97a1b8;font-family:Inter,-apple-system,"Helvetica Neue",Arial,sans-serif;font-weight:500}
.ax-strong{fill:#eef2fb;font-weight:700}
.ax-wa{fill:#25d366}
.ax-wa-text{fill:#fff;font-family:Inter,-apple-system,"Helvetica Neue",Arial,sans-serif;font-weight:700}
.ax-shopback{fill:#0f1626}
.ax-shopglass{fill:#7fd9ec;opacity:.16}
.ax-door{fill:#1d2840;stroke:var(--anatomy-lo);stroke-width:.4}
.ax-window-glass{fill:#16233b}
.ax-win{fill:#2b3d63;opacity:.85}
.ax-win-side{fill:#1d2a45}
.ax-pulse{stroke:#0ea5c6}
.ax-road{fill:#0f1524}
`;

// Links, data lines and trails that scenes draw over the objects (the overlay layer).
const EXTRA = `
.ax-link{stroke:#6b9bff;stroke-width:1.4;stroke-linecap:round}
.ax-link-cut{stroke:#ff6b81;stroke-width:1.4;stroke-linecap:round}
.ax-link-end{fill:#c9d4ea}
.ax-lock{fill:#ff6b81;stroke:#5a1f2a;stroke-width:.5}
.ax-lock-shackle{fill:none;stroke:#e3eaf7;stroke-width:1.6}
.ax-data{fill:none;stroke:#0ea5c6;stroke-width:1.8;stroke-linecap:round;filter:drop-shadow(0 0 2px #0ea5c6)}
.ax-packet{fill:#e9fbff;filter:drop-shadow(0 0 3px #5fe0f5)}
.ax-trail{fill:#3a4664}
.ax-trail-on{fill:#5fe0f5;filter:drop-shadow(0 0 2px #0ea5c6)}
.ax-roadslab{--anatomy-top:#10172a;--anatomy-shade-0:#0b1020;--anatomy-shade-1:#0d1324;--anatomy-shade-2:#0f1528;--anatomy-shade-3:#11182c;--anatomy-faint:#3a4664}
.ax-home{--anatomy-top:#3a3e5c;--anatomy-shade-0:#24273c;--anatomy-shade-1:#2a2d45;--anatomy-shade-2:#30344e;--anatomy-shade-3:#363a57}
`;

/** All CSS for the `ax` theme (navy), the brand accent replacing the default cyan. */
export const themeCss = (accent = "#0ea5c6") => (BASE + EXTRA).replaceAll("#0ea5c6", accent);
