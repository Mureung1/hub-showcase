import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: webOrigin });

  await app.listen(port);
}

void bootstrap();
