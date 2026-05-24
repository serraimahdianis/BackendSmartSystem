import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));

  // Enable CORS
  app.enableCors();

  // Global validation pipe — auto-validates all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Smart Attendance System API')
    .setDescription(
      'University attendance management system — Teachers, Students, Modules, Schedules, Sessions & Attendance',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication — register, login, OTP')
    .addTag('teachers', 'Teacher management (Admin)')
    .addTag('students', 'Student management (Admin)')
    .addTag('modules', 'Academic module management')
    .addTag('schedules', 'Weekly schedule management')
    .addTag('sessions', 'Class session management')
    .addTag('attendance', 'Attendance scanning & records')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    'Application running on: http://localhost:' + (process.env.PORT ?? 3000),
  );
  console.log(
    'Swagger docs: http://localhost:' + (process.env.PORT ?? 3000) + '/api',
  );
}
void bootstrap();
