import { f as __name, g as createDefaultSharedCoreModule, h as createDefaultCoreModule, i as CommonValueConverter, m as inject, p as EmptyFileSystem, s as MermaidGeneratedSharedModule, t as AbstractMermaidTokenBuilder, u as RadarGrammarGeneratedModule } from "./chunk-XZSTWKYB-C8VQjC2D.js";
//#region node_modules/@mermaid-js/parser/dist/chunks/mermaid-parser.core/chunk-L3YUKLVL.mjs
var RadarTokenBuilder = class extends AbstractMermaidTokenBuilder {
	static {
		__name(this, "RadarTokenBuilder");
	}
	constructor() {
		super(["radar-beta"]);
	}
};
var RadarModule = { parser: {
	TokenBuilder: /* @__PURE__ */ __name(() => new RadarTokenBuilder(), "TokenBuilder"),
	ValueConverter: /* @__PURE__ */ __name(() => new CommonValueConverter(), "ValueConverter")
} };
function createRadarServices(context = EmptyFileSystem) {
	const shared = inject(createDefaultSharedCoreModule(context), MermaidGeneratedSharedModule);
	const Radar = inject(createDefaultCoreModule({ shared }), RadarGrammarGeneratedModule, RadarModule);
	shared.ServiceRegistry.register(Radar);
	return {
		shared,
		Radar
	};
}
__name(createRadarServices, "createRadarServices");
//#endregion
export { createRadarServices as n, RadarModule as t };

//# sourceMappingURL=chunk-L3YUKLVL-eS537T5w.js.map