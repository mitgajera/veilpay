import { Command } from "commander";
import "./commands/init-mint";
import "./commands/init-balance";
import "./commands/send";
import "./commands/activity";

const program = new Command();
program.name("veilpay").description("VeilPay CLI").version("0.1.0");
program.parse();
