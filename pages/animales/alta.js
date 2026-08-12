import React, { useContext } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/layout';
import FormularioAnimal from '../../components/layout/FormularioAnimal';
import { FirebaseContext } from '../../firebase2';

const AltaAnimal = () => {
  const router = useRouter();
  const { tamboSel } = useContext(FirebaseContext);

  const handleCancel = () => {
    router.back();
  };

  const handleSuccess = () => {
    // Invalida el cache de Firestore de la lista de animales
    // para que al volver se recargue incluyendo el animal recien dado de alta
    if (tamboSel?.id) {
      sessionStorage.removeItem(`animales_data_cache_${tamboSel.id}`);
    }
    router.push('/animales');
  };

  return (
    <Layout titulo="Alta de Animal">
      <FormularioAnimal
        modo="alta"
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    </Layout>
  );
};

export default AltaAnimal;
