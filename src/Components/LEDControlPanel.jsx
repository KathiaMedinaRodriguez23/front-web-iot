import React, { useState, useEffect } from 'react';
import { db, ref, onValue, set } from '../fb.js';

const keyframes = `
@keyframes pulse-strong {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}
`;

const colorMap = {
  1: '#dc2626', // Rojo
  2: '#16a34a', // Verde
  3: '#2563eb', // Azul
  4: '#efda6e', // Amarillo
  5: '#7c3aed',  // Morado
  6: '#f97316', // Naranja
};

export default function LEDControlPanel() {
  // Inyectar keyframes al <head>
  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = keyframes;
    document.head.appendChild(styleTag);
    return () => document.head.removeChild(styleTag);
  }, []);

  // Estado local de LEDs inicializado desde colorMap
  const [leds, setLeds] = useState(
    Object.entries(colorMap).map(([id, hex]) => ({ id: Number(id), hex, on: false }))
  );
  const [effect, setEffect] = useState(null);

  useEffect(() => {
    const ledsRef = ref(db, 'leds');
    const unsubscribe = onValue(ledsRef, snapshot => {
      const data = snapshot.val() || {};
      const newState = Object.entries(colorMap).map(([id, hex]) => ({
        id: Number(id),
        hex,
        on: Boolean(data[id])
      }));
      setLeds(newState);
    });
    return () => unsubscribe();
  }, []);

  // Función para enviar el estado actual a Firebase
  const writeToDB = (ledArray) => {
    const updates = {};
    ledArray.forEach(l => updates[l.id] = l.on);
    set(ref(db, 'leds'), updates);
  };

  // Control de un LED individual
  const toggleLed = (id) => {
    setLeds(prev => {
      const updated = prev.map(l =>
        l.id === id ? { ...l, on: !l.on } : l
      );
      writeToDB(updated);
      return updated;
    });
  };

  // Encender todos
  const turnAllOn = () => {
    setLeds(prev => {
      const updated = prev.map(l => ({ ...l, on: true }));
      writeToDB(updated);
      return updated;
    });
    setEffect('all-on');
    setTimeout(() => setEffect(null), 1000);
  };

  // Apagar todos
  const turnAllOff = () => {
    setLeds(prev => {
      const updated = prev.map(l => ({ ...l, on: false }));
      writeToDB(updated);
      return updated;
    });
    setEffect('all-off');
    setTimeout(() => setEffect(null), 1000);
  };

  // Secuencia
  const startSequence = () => {
    turnAllOff();
    setEffect('sequence');
    leds.forEach((led, idx) => {
      setTimeout(() => {
        setLeds(prev => {
          const updated = prev.map(l =>
            l.id === led.id ? { ...l, on: true } : l
          );
          writeToDB(updated);
          return updated;
        });
        if (idx === leds.length - 1) {
          setTimeout(() => {
            turnAllOff();
            setEffect(null);
          }, 500);
        }
      }, idx * 5000);
    });
  };

  // Efecto aleatorio
  const randomEffect = () => {
    setEffect('random');
    const interval = setInterval(() => {
      setLeds(prev => {
        const updated = prev.map(l => ({ ...l, on: Math.random() > 0.5 }));
        writeToDB(updated);
        return updated;
      });
    }, 200);
    setTimeout(() => {
      clearInterval(interval);
      setEffect(null);
      turnAllOff();
    }, 3000);
  };

  return (
    <div style={{
      padding: '2rem',
      background: 'linear-gradient(145deg, #1f2937, #111827)',
      borderRadius: '1rem',
      margin: '2rem auto',
      maxWidth: '800px'
    }}>
      <h1 style={{ color: 'white', textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>
        Panel de Control de LEDs
      </h1>

      {/* LEDs en flex para que nunca bajen de fila */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        justifyContent: 'center',
        overflowX: 'auto'
      }}>
        {leds.map(led => (
          <div key={led.id} style={{ textAlign: 'center' }}>
            <div
              onClick={() => toggleLed(led.id)}
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                backgroundColor: led.on ? led.hex : '#111827',
                boxShadow: led.on ? `0 0 20px ${led.hex}` : '0 0 10px rgba(0,0,0,0.5)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animation: led.on ? 'pulse-strong 1.5s infinite' : 'none'
              }}
            />
            <button
              onClick={() => toggleLed(led.id)}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: led.on ? '#ef4444' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              {led.on ? 'Apagar' : 'Encender'}
            </button>
          </div>
        ))}
      </div>

      {/* Controles globales */}
      <div style={{
        marginTop: '2rem',
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={turnAllOn} style={{
            fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '0.375rem',
            backgroundColor: '#10b981', color: 'white', border: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
            animation: effect === 'all-on' ? 'pulse-strong 1.5s infinite' : 'none'
          }}>
            Encender Todos
          </button>
          <button onClick={turnAllOff} style={{
            fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '0.375rem',
            backgroundColor: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
            animation: effect === 'all-off' ? 'pulse-strong 1.5s infinite' : 'none'
          }}>
            Apagar Todos
          </button>
          <button onClick={startSequence} style={{
            fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '0.375rem',
            backgroundColor: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
            animation: effect === 'sequence' ? 'pulse-strong 1.5s infinite' : 'none'
          }}>
            Secuencia
          </button>
          <button onClick={randomEffect} style={{
            fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '0.375rem',
            backgroundColor: '#8b5cf6', color: 'white', border: 'none', cursor: 'pointer',
            transition: 'all 0.2s',
            animation: effect === 'random' ? 'pulse-strong 1.5s infinite' : 'none'
          }}>
            Aleatorio
          </button>
        </div>
      </div>

      {/* Estado del Sistema */}
      <div style={{
        marginTop: '2rem',
        backgroundColor: '#1f2937',
        border: '1px solid #374151',
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <h2 style={{
          color: 'white', fontSize: '1.125rem', fontWeight: 500,
          marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem'
        }}>
          Estado del Sistema
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
          {leds.map(led => (
            <div key={led.id} style={{
              display: 'flex', alignItems: 'center', backgroundColor: '#111827',
              padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #1f2937'
            }}>
              <div style={{
                width: '1rem', height: '1rem', borderRadius: '9999px', marginRight: '0.75rem',
                backgroundColor: led.on ? '#10b981' : '#ef4444',
                animation: led.on ? 'pulse-strong 1.5s infinite' : 'none'
              }}/>
              <span style={{ color: '#d1d5db', fontSize: '0.875rem', fontWeight: 500 }}>
                LED {led.id}: {led.on ? 'ENCENDIDO' : 'APAGADO'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
