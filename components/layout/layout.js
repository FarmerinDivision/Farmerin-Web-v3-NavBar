import React, { useState, useContext, useEffect } from 'react';
import NavBar from './NavBar';
import Navegacion from './navegacion';
import Footer from './footer'
import { useRouter } from 'next/router';
import { FirebaseContext } from '../../firebase2';

const Layout = props => {

  const { usuario } = useContext(FirebaseContext);
  const router = useRouter();

  //valida que el usuario esté logueado
  useEffect(() => {
    const redirectLogin = async () => {
      await router.push('/login');
    };
    if (!usuario) {
      redirectLogin();
    }
  }, [])

  const [collapsed, setCollapsed] = useState(false);
  const [toggled, setToggled] = useState(false);

  const handleCollapsedChange = (checked) => {
    setCollapsed(checked);
  };

  const handleToggleSidebar = (value) => {
    setToggled(value);
  };

  return (

    <div className="mainLayout" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <main className="mainContent" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
        <NavBar
          collapsed={collapsed}
          toggled={toggled}
          handleToggleSidebar={handleToggleSidebar}
          noStickyHeader={props.noStickyHeader}
        />

        <div style={{ flex: '1 0 auto', width: '100%' }}>
          {/* Permitir múltiples hijos, fragmentos, etc. */}
          {props.children}
        </div>

        <Footer />
      </main>
    </div>

  );
  // }
}

export default Layout;
