import { SQLDatabase } from "encore.dev/storage/sqldb";

export const musicDB = new SQLDatabase("music", {
  migrations: "./migrations",
});
