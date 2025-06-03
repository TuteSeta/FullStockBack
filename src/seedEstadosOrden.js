const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const estados = [
    { nombreEstadoOC: 'Pendiente' },
    { nombreEstadoOC: 'Enviada' },
    { nombreEstadoOC: 'Finalizada' },
    { nombreEstadoOC: 'Cancelada' }
  ];

  for (const estado of estados) {
    await prisma.estadoOrdenCompra.upsert({
      where: { nombreEstadoOC: estado.nombreEstadoOC },
      update: {},
      create: estado,
    });
  }

  console.log('Estados de orden de compra cargados correctamente.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });