import { f as __name, g as createDefaultSharedCoreModule, h as createDefaultCoreModule, i as CommonValueConverter, m as inject, o as InfoGrammarGeneratedModule, p as EmptyFileSystem, s as MermaidGeneratedSharedModule, t as AbstractMermaidTokenBuilder } from "./chunk-XZSTWKYB-C8VQjC2D.js";
//#region node_modules/@mermaid-js/parser/dist/chunks/mermaid-parser.core/chunk-EGIJ26TM.mjs
var InfoTokenBuilder = class extends AbstractMermaidTokenBuilder {
	static {
		__name(this, "InfoTokenBuilder");
	}
	constructor() {
		super(["info", "showInfo"]);
	}
};
var InfoModule = { parser: {
	TokenBuilder: /* @__PURE__ */ __name(() => new InfoTokenBuilder(), "TokenBuilder"),
	ValueConverter: /* @__PURE__ */ __name(() => new CommonValueConverter(), "ValueConverter")
} };
function createInfoServices(context = EmptyFileSystem) {
	const shared = inject(createDefaultSharedCoreModule(context), MermaidGeneratedSharedModule);
	const Info = inject(createDefaultCoreModule({ shared }), InfoGrammarGeneratedModule, InfoModule);
	shared.ServiceRegistry.register(Info);
	return {
		shared,
		Info
	};
}
__name(createInfoServices, "createInfoServices");
//#endregion
export { createInfoServices as n, InfoModule as t };

//# sourceMappingURL=chunk-EGIJ26TM-BogQb0Vq.js.map