import React, { createContext, useState, useContext } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FirebaseContext } from '../../firebase2';
import { FaMinus, FaPlus } from 'react-icons/fa';

const AdminContext = createContext();

export const useAdmin = () => {
    return useContext(AdminContext);
};

export const AdminProvider = ({ children }) => {
    const { usuario } = useContext(FirebaseContext);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const activateAdminMode = () => {
        setIsAdminMode(true);
        setShowModal(true);
        // Auto-close modal after 2 seconds for non-intrusive experience
        setTimeout(() => setShowModal(false), 2000);
    };

    const deactivateAdminMode = () => {
        setIsAdminMode(false);
    };

    const handleClose = () => setShowModal(false);
    const toggleMinimize = () => setIsMinimized(!isMinimized);

    return (
        <AdminContext.Provider value={{ isAdminMode, activateAdminMode, deactivateAdminMode }}>
            {children}

            {/* Global Modal */}
            <Modal show={showModal} onHide={handleClose} size="sm" centered>
                <Modal.Body style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    Modo administrador activado
                </Modal.Body>
                <Modal.Footer style={{ justifyContent: 'center', padding: '5px' }}>
                    <Button variant="primary" size="sm" onClick={handleClose}>
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Persistent Indicator Card */}
            {isAdminMode && (
                <>
                    <style jsx>{`
                        /* From Uiverse.io by andrew-demchenk0 */ 
                        .card {
                            --font-color: #323232;
                            --font-color-sub: #666;
                            --bg-color: #fff;
                            --main-color: #323232;
                            width: 200px;
                            height: ${isMinimized ? '60px' : '254px'};
                            background: var(--bg-color);
                            border: 2px solid var(--main-color);
                            box-shadow: 4px 4px var(--main-color);
                            border-radius: 5px;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: ${isMinimized ? 'center' : 'center'};
                            position: fixed;
                            bottom: 20px;
                            left: 20px;
                            z-index: 9999;
                            transition: height 0.3s ease;
                            /* overflow: hidden; Removed to prevent clipping */
                        }

                        .minimize-btn {
                            position: absolute;
                            top: 5px;
                            right: 5px;
                            background: none;
                            border: none;
                            cursor: pointer;
                            color: var(--main-color);
                            z-index: 10000;
                            padding: 5px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            opacity: 0.7;
                            transition: opacity 0.2s;
                        }

                        .minimize-btn:hover {
                            opacity: 1;
                        }

                        .card-photo {
                            transform: scale(0.3) translate(220px, 230px);
                            width: 250px;
                            height: 250px;
                            margin-left: -125px;
                            margin-top: -125px;
                            background: radial-gradient(circle,rgba(0,0,0,0.15) 50%,rgba(0,0,0,0) 50.8%) 14% 30%/11% 11%,radial-gradient(circle,#ffdab9 50%,rgba(255,218,185,0) 50.8%) 10% 30%/16% 16%,radial-gradient(circle,#8b4513 50%,rgba(139,69,19,0) 50.8%) 7.5% 29%/20% 20%,radial-gradient(circle,rgba(0,0,0,0.15) 50%,rgba(0,0,0,0) 50.8%) 86% 30%/11% 11%,radial-gradient(circle,#ffdab9 50%,rgba(255,218,185,0) 50.8%) 90% 30%/16% 16%,radial-gradient(circle,#8b4513 50%,rgba(139,69,19,0) 50.8%) 92.5% 29%/20% 20%,radial-gradient(circle at 50% 0,#ffdab9 29.5%,#8b4513 30%,#8b4513 35%,rgba(139,69,19,0) 35.5%) 50% 95%/40% 20%,radial-gradient(ellipse at 50% 100%,rgba(139,69,19,0) 49%,#8b4513 49.5%,#8b4513 52%,rgba(139,69,19,0) 52.5%) 50% 110%/120% 40%,radial-gradient(circle at 50% 0,rgba(255,255,255,0) 35%,white 35%,white 45%,rgba(255,255,255,0) 45.5%) 50% 89%/40% 13%,linear-gradient(#8b4513,#8b4513) 37% 100%/.25em 22%,linear-gradient(#8b4513,#8b4513) 63% 100%/.25em 22%,linear-gradient(80deg,rgba(0,0,0,0) 50%,#333 50.5%) 24% 100%/1em 18%,linear-gradient(-80deg,rgba(0,0,0,0) 50%,#333 50.5%) 76% 100%/1em 18%,linear-gradient(162deg,rgba(0,0,0,0) 10%,#333 10%) 30% 100%/1.5em 21%,linear-gradient(-162deg,rgba(0,0,0,0) 10%,#333 10%) 70% 100%/1.5em 21%,radial-gradient(ellipse at 100% 100%,#556b2f 50%,rgba(85,107,47,0) 50.5%) 0 100%/37% 29%,radial-gradient(ellipse at 0 100%,#556b2f 50%,rgba(85,107,47,0) 50.5%) 100% 100%/37% 29%,radial-gradient(ellipse at 50% 100%,#222 51%,rgba(0,0,0,0) 51.5%) 50% 110%/120% 40%,radial-gradient(circle at 50% 0,rgba(0,0,0,0.15) 40%,rgba(0,0,0,0) 40.5%) 50% 82%/20% 20%,linear-gradient(to right,#8b4513 4px,rgba(139,69,19,0) 4px) 50% 80%/20% 20%,linear-gradient(to left,#8b4513 4px,rgba(139,69,19,0) 4px) 50% 80%/20% 20%,linear-gradient(#ffdab9,#ffdab9) 50% 80%/20% 20%,linear-gradient(#48240a,#48240a) 50% 100%/65% 60%,radial-gradient(circle,white 30%,rgba(255,255,255,0) 62%) 50% 50%/100% 100%;
                            background-color: #ccc;
                            background-repeat: no-repeat;
                            border-radius: 30%;
                            opacity: ${isMinimized ? 0 : 1};
                            transition: opacity 0.2s;
                            pointer-events: ${isMinimized ? 'none' : 'auto'};
                            display: ${isMinimized ? 'none' : 'block'};
                        }

                        /* delete */
                        .card-photo::before {
                            display: block;
                            content: '';
                            position: absolute;
                            box-sizing: border-box;
                            width: 160px;
                            height: 200px;
                            left: 50%;
                            top: -10%;
                            margin-left: -80px;
                            background: radial-gradient(circle at 50% 0,#ffdab9 30%,#8b4513 30.5%,#8b4513 41%,rgba(139,69,19,0) 41.5%) 50% 76%/2em 2em,radial-gradient(ellipse,rgba(139,69,19,0) 25%,#5e2f0d 25.5%,#5e2f0d 40%,rgba(139,69,19,0) 40.5%) 50% 100%/100% 40%,radial-gradient(ellipse at 50% 0,#8b4513 40%,#ffdab9 40.5%,#ffdab9 58%,rgba(255,218,185,0) 59%) 50% 83%/3em 1em,linear-gradient(#5e2f0d,#5e2f0d) 50% 86%/1em 1em,radial-gradient(circle,#5e2f0d 40%,rgba(139,69,19,0) 40.5%) 26% 56%/1em 1em,radial-gradient(circle,#5e2f0d 40%,rgba(139,69,19,0) 40.5%) 74% 56%/1em 1em,radial-gradient(ellipse,rgba(139,69,19,0) 52%,#8b4513 52.5%,#8b4513 55%,rgba(139,69,19,0) 55.5%) 50% 100%/150% 80%,radial-gradient(ellipse,rgba(0,0,0,0) 46%,rgba(0,0,0,0.15) 46.5%,rgba(0,0,0,0.15) 53%,rgba(0,0,0,0) 53%) 50% 100%/150% 80%,radial-gradient(ellipse,#ffdab9 53%,rgba(255,218,185,0) 53.5%) 50% 100%/150% 80%,radial-gradient(ellipse at 50% 100%,rgba(139,69,19,0) 35.5%,#8b4513 36%,#8b4513 38%,white 38.5%) 50% -45%/110% 60%,radial-gradient(circle,#444 23%,rgba(0,0,0,0) 24%) 30% 26%/1em 1em,radial-gradient(circle,#444 23%,rgba(0,0,0,0) 24%) 40% 25%/1em 1em,radial-gradient(circle,#444 23%,rgba(0,0,0,0) 24%) 50% 24.5%/1em 1em,radial-gradient(circle,#444 23%,rgba(0,0,0,0) 24%) 60% 25%/1em 1em,radial-gradient(circle,#444 23%,rgba(0,0,0,0) 24%) 70% 26%/1em 1em,radial-gradient(ellipse,#666 63%,#8b4513 63.5%,#8b4513 66%,rgba(139,69,19,0) 66.5%) 50% 100%/150% 80%,radial-gradient(ellipse,rgba(139,69,19,0) 40%,#5e2f0d 40.5%) 50% 0/150% 80%,linear-gradient(rgba(0,0,0,0.15),rgba(0,0,0,0.15)) 50% 50%/100% 100%;
                            background-repeat: no-repeat;
                            background-color: #ffdab9;
                            border-radius: 50% 50% 50% 50%/60% 60% 40% 40%;
                            border: 4px solid #8b4513;
                            box-shadow: inset 0 -.2em 0 .5em rgba(0,0,0,0.15),inset 0 -1.6em 0 #5e2f0d;
                        }

                        /* delete */
                        .card-photo::after {
                            display: block;
                            content: '';
                            position: absolute;
                            width: 2.5em;
                            height: .8em;
                            left: 28.5%;
                            top: 26%;
                            background-color: #5e2f0d;
                            border-radius: .3em;
                            box-shadow: 4.2em 0 0 #5e2f0d;
                        }

                        .card-title {
                            text-align: center;
                            color: var(--font-color);
                            font-size: 20px;
                            font-weight: 400;
                            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                            margin-top: ${isMinimized ? '0' : '20px'};
                            transition: margin 0.3s ease;
                        }

                        .card-title span {
                            font-size: 15px;
                            color: var(--font-color-sub);
                            display: ${isMinimized ? 'none' : 'block'};
                        }

                        .card-info {
                            margin-top: 15px;
                            text-align: center;
                            font-size: 12px;
                            color: var(--font-color-sub);
                            padding: 0 10px;
                            line-height: 1.4;
                            display: ${isMinimized ? 'none' : 'block'};
                        }
                        
                        .card:hover > .card-photo {
                            transition: 0.3s;
                            transform: ${isMinimized ? 'none' : 'scale(0.4) translate(160px, 150px)'};
                        }
                    `}</style>

                    <div className="card">
                        <button className="minimize-btn" onClick={toggleMinimize} title={isMinimized ? "Expandir" : "Minimizar"}>
                            {isMinimized ? <FaPlus /> : <FaMinus />}
                        </button>
                        <div className="card-photo"></div>
                        <div className="card-title">
                            {usuario ? usuario.displayName || usuario.email || "Usuario" : "Usuario"} <br />
                            <span>Administrador</span>
                        </div>
                        <div className="card-info">
                            Estás operando en modo administrador dentro de un tambo administrador.
                        </div>
                    </div>
                </>
            )}
        </AdminContext.Provider>
    );
};
