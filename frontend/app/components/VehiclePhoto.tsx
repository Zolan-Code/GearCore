'use client';

import React, { useState, useEffect } from 'react';

interface VehiclePhotoProps {
  marca: string;
  modelo: string;
  className?: string;
}

// Caché en memoria para no repetir peticiones a Wikipedia
const photoCache: Record<string, string | null> = {};

export default function VehiclePhoto({
  marca,
  modelo,
  className,
}: VehiclePhotoProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const term = `${marca.trim()} ${modelo.trim()}`;

    if (!marca || !modelo) {
      setPhotoUrl(null);
      setLoading(false);
      return;
    }

    if (photoCache[term] !== undefined) {
      setPhotoUrl(photoCache[term]);
      setLoading(false);
      return;
    }

    setLoading(true);

    async function fetchCarPhoto() {
      try {
        // 1. Intentar endpoint directo de Wikipedia en español
        let res = await fetch(
          `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
          { headers: { 'User-Agent': 'GearCoreERP/1.0' } },
        );

        if (res.ok) {
          const data = await res.json();
          const img = data.thumbnail?.source || data.originalimage?.source;
          if (img) {
            photoCache[term] = img;
            if (isMounted) {
              setPhotoUrl(img);
              setLoading(false);
            }
            return;
          }
        }

        // 2. Intentar endpoint directo de Wikipedia en inglés
        res = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`,
          { headers: { 'User-Agent': 'GearCoreERP/1.0' } },
        );

        if (res.ok) {
          const data = await res.json();
          const img = data.thumbnail?.source || data.originalimage?.source;
          if (img) {
            photoCache[term] = img;
            if (isMounted) {
              setPhotoUrl(img);
              setLoading(false);
            }
            return;
          }
        }

        // 3. Búsqueda por término en Wikipedia si el título no es idéntico
        const searchUrl = `https://es.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(
          term,
        )}&gsrlimit=1&prop=pageimages&pithumbsize=400`;

        res = await fetch(searchUrl);
        if (res.ok) {
          const searchData = await res.json();
          const pages = searchData.query?.pages;
          if (pages) {
            const firstPage: any = Object.values(pages)[0];
            if (firstPage?.thumbnail?.source) {
              const img = firstPage.thumbnail.source;
              photoCache[term] = img;
              if (isMounted) {
                setPhotoUrl(img);
                setLoading(false);
              }
              return;
            }
          }
        }

        photoCache[term] = null;
        if (isMounted) {
          setPhotoUrl(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error buscando foto en Wikipedia:', err);
        photoCache[term] = null;
        if (isMounted) {
          setPhotoUrl(null);
          setLoading(false);
        }
      }
    }

    fetchCarPhoto();

    return () => {
      isMounted = false;
    };
  }, [marca, modelo]);

  if (loading) {
    return (
      <div
        style={{
          width: '120px',
          height: '75px',
          borderRadius: '10px',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          color: '#94a3b8',
        }}
      >
        Cargando...
      </div>
    );
  }

  if (!photoUrl) {
    return null;
  }

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
      title={`${marca} ${modelo}`}
    >
      <div
        style={{
          maxWidth: '150px',
          maxHeight: '80px',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.12)',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={photoUrl}
          alt={`${marca} ${modelo}`}
          style={{
            maxWidth: '100%',
            maxHeight: '80px',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={() => setPhotoUrl(null)}
        />
      </div>
      <span
        style={{
          fontSize: '9.5px',
          fontWeight: 600,
          color: '#94a3b8',
        }}
      >
        Foto de referencia
      </span>
    </div>
  );
}
