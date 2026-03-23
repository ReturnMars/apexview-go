import { c as PacketGrammarGeneratedModule, f as __name, g as createDefaultSharedCoreModule, h as createDefaultCoreModule, i as CommonValueConverter, m as inject, p as EmptyFileSystem, s as MermaidGeneratedSharedModule, t as AbstractMermaidTokenBuilder } from "./chunk-XZSTWKYB-C8VQjC2D.js";
//#region node_modules/@mermaid-js/parser/dist/chunks/mermaid-parser.core/chunk-C72U2L5F.mjs
var PacketTokenBuilder = class extends AbstractMermaidTokenBuilder {
	static {
		__name(this, "PacketTokenBuilder");
	}
	constructor() {
		super(["packet"]);
	}
};
var PacketModule = { parser: {
	TokenBuilder: /* @__PURE__ */ __name(() => new PacketTokenBuilder(), "TokenBuilder"),
	ValueConverter: /* @__PURE__ */ __name(() => new CommonValueConverter(), "ValueConverter")
} };
function createPacketServices(context = EmptyFileSystem) {
	const shared = inject(createDefaultSharedCoreModule(context), MermaidGeneratedSharedModule);
	const Packet = inject(createDefaultCoreModule({ shared }), PacketGrammarGeneratedModule, PacketModule);
	shared.ServiceRegistry.register(Packet);
	return {
		shared,
		Packet
	};
}
__name(createPacketServices, "createPacketServices");
//#endregion
export { createPacketServices as n, PacketModule as t };

//# sourceMappingURL=chunk-C72U2L5F-CxhPltUp.js.map