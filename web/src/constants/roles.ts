// Role values from the smart contract
// 0 = None, 1 = Producer, 2 = Factory, 3 = Retailer, 4 = Consumer, 5 = Admin

export const ROLE_NAMES: Record<number, string> = {
  0: 'Sin rol',
  1: 'Productor',
  2: 'Fábrica',
  3: 'Minorista',
  4: 'Consumidor',
  5: 'Administrador',
};

export const ROLE_DESCRIPTIONS: Record<number, string> = {
  1: 'Responsable de crear materias primas y productos iniciales',
  2: 'Transforma materias primas en productos procesados',
  3: 'Distribuye productos a consumidores finales',
  4: 'Usuario final de la cadena de suministro',
  5: 'Administrador del sistema. Gestiona solicitudes de roles y usuarios. Solo disponible si no existe un administrador.',
};

export const ROLE_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-green-100 text-green-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
};

export const ROLE_OPTIONS = [
  { value: '1', label: ROLE_NAMES[1] },
  { value: '2', label: ROLE_NAMES[2] },
  { value: '3', label: ROLE_NAMES[3] },
  { value: '4', label: ROLE_NAMES[4] },
  { value: '5', label: ROLE_NAMES[5] },
];
