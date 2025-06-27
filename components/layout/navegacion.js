import React, { useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AiOutlineBars } from 'react-icons/ai';
import { Button } from 'react-bootstrap';
import Switch from 'react-switch';
import { FirebaseContext } from '../../firebase2';
import { useDispatch, useSelector } from "react-redux";
import { updateValor } from '../../redux/valorSlice';

const Navegacion = ({ collapsed, toggled, handleToggleSidebar, handleCollapsedChange, titulo }) => {
  const { usuario, firebase, guardarTamboSel, tambos, tamboSel, porc } = useContext(FirebaseContext);
  const router = useRouter();

  const [showPerfil, setShowPerfil] = useState(false); // Modal perfil

  const dispatch = useDispatch();
  const valor = useSelector((state) => state.valor);

  useEffect(() => {
    if (porc !== undefined) {
      dispatch(updateValor(porc));
    }
  }, [porc, dispatch]);

  useEffect(() => {
    if (tamboSel && tamboSel.porcentaje !== undefined) {
      dispatch(updateValor(tamboSel.porcentaje));
    }
  }, [tamboSel, dispatch]);

  function cerrarSesion() {
    guardarTamboSel(null);
    firebase.logout();
    return router.push('/login');
  }

  const handlePerfilClose = () => setShowPerfil(false);
  const handlePerfilShow = () => setShowPerfil(true);

  return (
    <header>
      <div className="elem-header">
        <div className="block">
          <Switch
            height={16}
            width={30}
            checkedIcon={false}
            uncheckedIcon={false}
            onChange={handleCollapsedChange}
            checked={collapsed}
            onColor="#219de9"
            offColor="#bbbbbb"
          />
        </div>

        <div className='hambur' onClick={() => handleToggleSidebar(true)}>
          <AiOutlineBars size={40} />
        </div>

        <div className='responsive'>
          <h5>{titulo}{tamboSel && ' - ' + tamboSel.nombre}</h5>
        </div>

        <div className="elem-header-der">
          {usuario &&
            <>
              {/* Aquí podrías poner otras acciones del usuario si fuera necesario */}
            </>
          }
        </div>
      </div>
    </header>
  );
};

export default Navegacion;
