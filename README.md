# Escriba Médico Ambiental

MVP de un escriba médico con IA para automatizar la documentación de consultas médicas en Argentina y LATAM.

## Stack

- **Frontend**: Next.js 14, Tailwind CSS, Zustand
- **Backend**: Node.js, Clean Architecture
- **Base de datos**: PostgreSQL + Prisma
- **ASR**: AssemblyAI (transcripción + diarización)
- **LLM**: OpenAI GPT-4

## Requisitos

- Node.js 18+
- PostgreSQL (o [Prisma Postgres](https://www.prisma.io/docs/orm/overview/databases/prisma-postgres) con `npx prisma dev`)
- Cuentas en [AssemblyAI](https://www.assemblyai.com/) y [OpenAI](https://platform.openai.com/)

## Configuración

1. Copiar `.env.example` a `.env`
2. Configurar variables:
   - `ASSEMBLYAI_API_KEY`
   - `OPENAI_API_KEY`
   - `DATABASE_URL` (PostgreSQL)

3. Ejecutar migraciones:
   ```bash
   npx prisma migrate deploy
   ```
   (o `npx prisma migrate dev` en desarrollo.)

4. Tras cambios en `prisma/schema.prisma`, regenerar el cliente (también corre en `npm install` vía `postinstall`):
   ```bash
   npx prisma generate
   ```
   Si en Windows falla con **EPERM** al reemplazar `query_engine`, cerrá el servidor `npm run dev` y volvé a ejecutar `npx prisma generate`.

5. Iniciar el proyecto:
   ```bash
   npm run dev
   ```

## Flujo

1. **Grabar** (`/`): Grabar consulta con el micrófono
2. **Procesar**: Audio → AssemblyAI (ASR + diarización) → OpenAI (SOAP, recetas, órdenes)
3. **Dashboard** (`/dashboard`): Ver consultas, editar nota, copiar para WhatsApp
4. **Evidencia enlazada** (`/linked-evidence`): Mapeo nota ↔ transcripción
5. **Firmar**: Guardar versión final

## Política de retención

El audio se elimina en 30 días. Los datos estructurados (nota, recetas, órdenes) se conservan.
