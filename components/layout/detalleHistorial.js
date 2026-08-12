import React, { useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import FichaAnimal from './fichaAnimal';

const DetalleHistorial = ({ historial = {}, onHistorialClick }) => {
    // Si historial es undefined o no tiene 'descripcion', se muestra un valor por defecto
    const descripcion = historial.descripcion || 'Descripción no disponible';
    const fecha = historial.fecha ? new Date(historial.fecha).toLocaleString('es-AR') : 'Fecha no disponible';
    const animal = historial.animal || 'Animal no disponible';

    const [showFicha, setShowFicha] = useState(false);

    const handleFichaClick = () => {
        if (typeof onHistorialClick === 'function') {
            onHistorialClick(animal);
        }
        if (animal && typeof animal === 'object') {
            setShowFicha(true);
        }
    };

    return (
        <>
            <Card className="mb-3">
                <Card.Body>
                    <Card.Title>{descripcion}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">{fecha}</Card.Subtitle>
                    <Button variant="primary" onClick={handleFichaClick}>
                        Ver Ficha del Animal
                    </Button>
                </Card.Body>
            </Card>
            {showFicha && animal && typeof animal === 'object' && (
                <FichaAnimal
                    animal={animal}
                    show={showFicha}
                    setShow={setShowFicha}
                />
            )}
        </>
    );
};

export default DetalleHistorial;
