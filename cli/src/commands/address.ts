import { Command } from "commander";
import { action } from "../run";
import { emit } from "../output";

export function addressCmd() {
  return new Command("address")
    .description("Show the active wallet and program addresses")
    .action(
      action(async ({ client, json }) => {
        emit(
          json,
          { wallet: client.owner.toBase58(), programId: client.programId.toBase58() },
          () => {
            console.log("wallet:    ", client.owner.toBase58());
            console.log("program_id:", client.programId.toBase58());
          },
        );
      }),
    );
}
