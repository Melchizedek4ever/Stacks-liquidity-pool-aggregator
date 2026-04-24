"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dexAdapters = void 0;
const alexAdapter_1 = require("./alexAdapter");
const bitflowAdapter_1 = require("./bitflowAdapter");
const velarAdapter_1 = require("./velarAdapter");
exports.dexAdapters = [bitflowAdapter_1.bitflowAdapter, velarAdapter_1.velarAdapter, alexAdapter_1.alexAdapter];
