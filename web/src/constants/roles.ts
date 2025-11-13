// Enum Role values from the smart contract
// 0 = None, 1 = Producer, 2 = Factory, 3 = Retailer, 4 = Consumer
export enum Role {
  None = 0,
  Producer = 1,
  Factory = 2,
  Retailer = 3,
  Consumer = 4,
}

export const ROLE_NAMES: Record<number, string> = {
  [Role.None]: 'Sin rol',
  [Role.Producer]: 'Productor',
  [Role.Factory]: 'Fábrica',
  [Role.Retailer]: 'Minorista',
  [Role.Consumer]: 'Consumidor',
};

export const ROLE_DESCRIPTIONS: Record<number, string> = {
  [Role.Producer]: 'Responsable de crear materias primas y productos iniciales',
  [Role.Factory]: 'Transforma materias primas en productos procesados',
  [Role.Retailer]: 'Distribuye productos a consumidores finales',
  [Role.Consumer]: 'Usuario final de la cadena de suministro',
};

export const ROLE_COLORS: Record<number, string> = {
  [Role.None]: 'bg-gray-100 text-gray-700',
  [Role.Producer]: 'bg-green-100 text-green-700',
  [Role.Factory]: 'bg-blue-100 text-blue-700',
  [Role.Retailer]: 'bg-purple-100 text-purple-700',
  [Role.Consumer]: 'bg-orange-100 text-orange-700',
};

export const ROLE_OPTIONS = [
  { value: String(Role.Producer), label: ROLE_NAMES[Role.Producer] },
  { value: String(Role.Factory), label: ROLE_NAMES[Role.Factory] },
  { value: String(Role.Retailer), label: ROLE_NAMES[Role.Retailer] },
  { value: String(Role.Consumer), label: ROLE_NAMES[Role.Consumer] },
];
