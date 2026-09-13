'use client';

import React from 'react';

export type VehicleType = 'sedan' | 'suv' | 'hatchback' | 'pickup' | 'van' | 'moto';

export function detectVehicleType(marca = '', modelo = ''): VehicleType {
  const combined = `${marca} ${modelo}`.toLowerCase();

  // Motos
  if (
    /moto|scooter|ninja|pulsar|cbr|yamaha|kawasaki|ducati|bmw r|fz|ybr|storm|vespa/.test(
      combined,
    )
  ) {
    return 'moto';
  }

  // Camionetas / Pickups
  if (
    /hilux|l200|navara|d-max|dmax|ranger|amarok|poer|silverado|f-150|f150|ram|tundra|titan|colorado|saveiro|strada|montana|oroch|camioneta|pickup/.test(
      combined,
    )
  ) {
    return 'pickup';
  }

  // Vans / Furgones
  if (/partner|berlingo|kangoo|transit|boxer|master|ducato|fiorino|h-1|h1|van|furgon/.test(combined)) {
    return 'van';
  }

  // SUVs / Crossovers
  if (
    /tucson|rav4|sportage|duster|tracker|kicks|cx-3|cx-5|cx-30|cx-50|cx-90|qashqai|xtrail|x-trail|santa fe|outlander|creta|vitara|grand vitara|ecosport|kuga|tiguan|taos|t-cross|nivus|compass|cherokee|renegade|suburban|tahoe|explorer|cr-v|hr-v|wr-v|suv|crossover|trax|captiva/.test(
      combined,
    )
  ) {
    return 'suv';
  }

  // Hatchbacks
  if (
    /swift|morning|spark|gol|208|308|clio|c3|i10|i20|mazda 2|rio 5|yaris sport|polo|march|celerio|baleno|hb20|onix|fit|sandero|up|kwid|picanto/.test(
      combined,
    )
  ) {
    return 'hatchback';
  }

  // Default: Sedán (Sail, Yaris, Versa, Corolla, Elantra, Civic, Sentra, etc.)
  return 'sedan';
}

interface VehicleSilhouetteProps {
  marca: string;
  modelo: string;
  className?: string;
}

export default function VehicleSilhouette({
  marca,
  modelo,
  className,
}: VehicleSilhouetteProps) {
  const type = detectVehicleType(marca, modelo);

  const typeLabels: Record<VehicleType, string> = {
    sedan: 'Sedán',
    suv: 'SUV / Crossover',
    hatchback: 'Hatchback',
    pickup: 'Camioneta',
    van: 'Furgón Comercial',
    moto: 'Motocicleta',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
      }}
      className={className}
      title={`${typeLabels[type]} - ${marca} ${modelo}`}
    >
      <div style={{ width: '130px', height: '52px' }}>
        {type === 'sedan' && <SedanSVG />}
        {type === 'suv' && <SuvSVG />}
        {type === 'hatchback' && <HatchbackSVG />}
        {type === 'pickup' && <PickupSVG />}
        {type === 'van' && <VanSVG />}
        {type === 'moto' && <MotoSVG />}
      </div>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#64748b',
          background: '#f1f5f9',
          padding: '2px 8px',
          borderRadius: '6px',
        }}
      >
        {typeLabels[type]}
      </span>
    </div>
  );
}

/* Silueta Sedán Moderno */
function SedanSVG() {
  return (
    <svg viewBox="0 0 160 65" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="bodyGradSedan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Carrocería Sedán */}
      <path
        d="M8 43 C 12 40, 20 38, 30 38 L 46 38 L 62 20 C 66 16, 75 14, 98 14 L 115 14 C 126 14, 134 23, 140 28 L 148 34 C 154 38, 156 42, 156 46 L 152 49 C 148 50, 142 50, 138 50 C 138 42, 126 42, 126 50 L 52 50 C 52 42, 40 42, 40 50 L 14 50 C 10 50, 6 47, 8 43 Z"
        fill="url(#bodyGradSedan)"
      />
      {/* Ventanas */}
      <path
        d="M 64 22 L 84 22 L 84 34 L 51 34 Z"
        fill="#e0e7ff"
        opacity="0.85"
      />
      <path
        d="M 88 22 L 114 22 C 121 22, 126 27, 131 34 L 88 34 Z"
        fill="#e0e7ff"
        opacity="0.85"
      />
      {/* Faro delantero y trasero */}
      <path d="M 152 40 L 156 42 L 153 45 Z" fill="#38bdf8" />
      <path d="M 8 42 L 12 42 L 10 45 Z" fill="#ef4444" />
      {/* Ruedas */}
      <circle cx="46" cy="50" r="10" fill="#0f172a" />
      <circle cx="46" cy="50" r="5" fill="#cbd5e1" />
      <circle cx="132" cy="50" r="10" fill="#0f172a" />
      <circle cx="132" cy="50" r="5" fill="#cbd5e1" />
    </svg>
  );
}

/* Silueta SUV / Crossover */
function SuvSVG() {
  return (
    <svg viewBox="0 0 160 65" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="bodyGradSuv" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      {/* Barras de techo */}
      <path d="M 44 11 L 112 11" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      {/* Carrocería SUV */}
      <path
        d="M 8 43 C 10 38, 16 36, 26 36 L 40 36 L 50 16 C 54 13, 62 13, 116 13 C 122 13, 126 18, 134 26 L 148 34 C 154 38, 156 41, 156 46 L 152 49 C 146 50, 142 50, 138 50 C 138 40, 124 40, 124 50 L 54 50 C 54 40, 40 40, 40 50 L 14 50 C 10 50, 6 47, 8 43 Z"
        fill="url(#bodyGradSuv)"
      />
      {/* Ventanas */}
      <path d="M 32 32 L 44 20 L 60 20 L 60 32 Z" fill="#e0e7ff" opacity="0.85" />
      <path d="M 64 20 L 86 20 L 86 32 L 64 32 Z" fill="#e0e7ff" opacity="0.85" />
      <path d="M 90 20 L 114 20 C 118 20, 124 25, 129 32 L 90 32 Z" fill="#e0e7ff" opacity="0.85" />
      {/* Faros */}
      <path d="M 152 39 L 156 41 L 153 44 Z" fill="#38bdf8" />
      <path d="M 8 38 L 12 38 L 10 42 Z" fill="#ef4444" />
      {/* Ruedas grandes */}
      <circle cx="47" cy="50" r="11" fill="#0f172a" />
      <circle cx="47" cy="50" r="5.5" fill="#cbd5e1" />
      <circle cx="131" cy="50" r="11" fill="#0f172a" />
      <circle cx="131" cy="50" r="5.5" fill="#cbd5e1" />
    </svg>
  );
}

/* Silueta Hatchback */
function HatchbackSVG() {
  return (
    <svg viewBox="0 0 160 65" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="bodyGradHatch" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <path
        d="M 14 43 C 18 36, 24 36, 32 36 L 46 36 L 58 18 C 62 15, 70 15, 96 15 C 104 15, 114 22, 126 29 L 144 36 C 150 39, 152 42, 152 46 L 148 49 C 144 50, 138 50, 134 50 C 134 42, 122 42, 122 50 L 54 50 C 54 42, 42 42, 42 50 L 18 50 C 14 50, 12 47, 14 43 Z"
        fill="url(#bodyGradHatch)"
      />
      {/* Ventanas */}
      <path d="M 28 32 L 48 21 L 70 21 L 70 32 Z" fill="#e0e7ff" opacity="0.85" />
      <path d="M 74 21 L 94 21 C 100 21, 108 26, 115 32 L 74 32 Z" fill="#e0e7ff" opacity="0.85" />
      {/* Ruedas */}
      <circle cx="48" cy="50" r="9.5" fill="#0f172a" />
      <circle cx="48" cy="50" r="4.5" fill="#cbd5e1" />
      <circle cx="128" cy="50" r="9.5" fill="#0f172a" />
      <circle cx="128" cy="50" r="4.5" fill="#cbd5e1" />
    </svg>
  );
}

/* Silueta Camioneta / Pickup */
function PickupSVG() {
  return (
    <svg viewBox="0 0 160 65" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="bodyGradPickup" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      {/* Carrocería Pickup con Pick-up box */}
      <path
        d="M 6 36 L 56 36 L 56 16 C 58 14, 66 14, 108 14 C 114 14, 120 18, 128 26 L 148 34 C 154 38, 156 42, 156 46 L 152 49 C 146 50, 142 50, 138 50 C 138 39, 122 39, 122 50 L 52 50 C 52 39, 36 39, 36 50 L 12 50 C 8 50, 6 46, 6 36 Z"
        fill="url(#bodyGradPickup)"
      />
      {/* Ventanas cabina */}
      <path d="M 60 20 L 82 20 L 82 32 L 60 32 Z" fill="#e0e7ff" opacity="0.85" />
      <path d="M 86 20 L 106 20 C 111 20, 117 25, 122 32 L 86 32 Z" fill="#e0e7ff" opacity="0.85" />
      {/* Ruedas grandes todoterreno */}
      <circle cx="44" cy="50" r="11.5" fill="#0f172a" />
      <circle cx="44" cy="50" r="5.5" fill="#cbd5e1" />
      <circle cx="130" cy="50" r="11.5" fill="#0f172a" />
      <circle cx="130" cy="50" r="5.5" fill="#cbd5e1" />
    </svg>
  );
}

/* Silueta Furgón / Van Comercial */
function VanSVG() {
  return (
    <svg viewBox="0 0 160 65" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="bodyGradVan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d="M 10 46 L 10 20 C 10 16, 14 14, 20 14 L 110 14 C 118 14, 126 20, 134 28 L 148 35 C 154 39, 156 42, 156 46 L 152 49 C 146 50, 142 50, 138 50 C 138 40, 124 40, 124 50 L 52 50 C 52 40, 38 40, 38 50 L 16 50 C 12 50, 10 48, 10 46 Z"
        fill="url(#bodyGradVan)"
      />
      {/* Ventana cabina delantera */}
      <path d="M 104 18 L 114 18 C 120 18, 127 24, 132 32 L 104 32 Z" fill="#e0e7ff" opacity="0.85" />
      {/* Ruedas */}
      <circle cx="45" cy="50" r="10.5" fill="#0f172a" />
      <circle cx="45" cy="50" r="5" fill="#cbd5e1" />
      <circle cx="131" cy="50" r="10.5" fill="#0f172a" />
      <circle cx="131" cy="50" r="5" fill="#cbd5e1" />
    </svg>
  );
}

/* Silueta Moto */
function MotoSVG() {
  return (
    <svg viewBox="0 0 160 65" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
      {/* Ruedas moto */}
      <circle cx="40" cy="46" r="12" stroke="#0f172a" strokeWidth="5" fill="none" />
      <circle cx="120" cy="46" r="12" stroke="#0f172a" strokeWidth="5" fill="none" />
      {/* Cuadro y carrocería */}
      <path
        d="M 40 46 L 68 46 L 82 32 L 64 26 L 56 34 L 40 46 Z"
        fill="#1e1b4b"
      />
      <path
        d="M 72 32 L 100 24 L 112 34 L 120 46"
        stroke="#3b82f6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Manubrio y tanque */}
      <path d="M 96 18 L 104 24" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="86" cy="25" rx="10" ry="5" fill="#ef4444" />
    </svg>
  );
}
