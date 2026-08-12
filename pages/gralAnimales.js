import React, { useState, useEffect, useContext } from 'react'
import { FirebaseContext } from '../firebase2';
import { Botonera, Mensaje, ContenedorSpinner, Contenedor } from '../components/ui/Elementos';
import Layout from '../components/layout/layout';
import DetalleGralAnimal from '../components/layout/detalleGralAnimal';
import SelectTambo from '../components/layout/selectTambo';
import StickyTable from "react-sticky-table-thead"
import { FaSort } from 'react-icons/fa';
import { Button, Form, Row, Col, Alert, Spinner, Table } from 'react-bootstrap';
import { RiSearchLine } from 'react-icons/ri';
import differenceInDays from 'date-fns/differenceInDays'
import { format } from 'date-fns'
import ReactExport from "../components/utils/ExcelExport";
import styles from '../styles/gralAnimales.module.scss'

const GralAnimales = () => {

  const [animales, guardarAnimales] = useState([]);
  const [rodeos, guardarRodeos] = useState([]);
  const [grupos, guardarGrupos] = useState([]);
  const [animalesBase, guardarAnimalesBase] = useState([]);
  const [valores, guardarValores] = useState({
    idTambo: '',
    rp: '',
    estpro: 'todos',
    estrep: 'todos',
    categoria: 'todos',
    rodeo: 0,
    grupo: 'todos'
  });
  let diasLact = 0;

  const [procesando, guardarProcesando] = useState(false);
  const { rp, estpro, estrep, categoria, rodeo, campoorden, tipoorden } = valores;
  const { firebase, tamboSel, archivoExcel, guardarArchivoExcel } = useContext(FirebaseContext);
  const [orderRp, guardarOrderRp] = useState('asc');
  const [orderEr, guardarOrderEr] = useState('asc');
  const [orderEp, guardarOrderEp] = useState('asc');
  const [orderGr, guardarOrderGr] = useState('asc');
  const [orderRo, guardarOrderRo] = useState('asc');

  const [orderLact, guardarOrderLact] = useState('asc');
  const [orderUC, guardarOrderUC] = useState('asc');
  const [orderCA, guardarOrderCA] = useState('asc');
  const [orderDl, guardarOrderDl] = useState('asc');
  const [orderRac, guardarOrderRac] = useState('asc');

  const ExcelFile = ReactExport.ExcelFile;
  const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;
  const ExcelColumn = ReactExport.ExcelFile.ExcelColumn;

  useEffect(() => {

    obtenerAnimales();
    aplicarFiltro();
    obtenerRodeos();
    obtenerGrupos();

  }, [tamboSel]);


  const handleSubmit = e => {
    e.preventDefault();
    aplicarFiltro();
  }

  const handleChange = e => {
    guardarValores({
      ...valores,
      [e.target.name]: e.target.value
    })

  }

  function obtenerAnimales() {

    guardarProcesando(true);
    if (tamboSel) {
      try {
        firebase.db.collection('animal').where('idtambo', '==', tamboSel.id).where('fbaja', '==', '').orderBy('rp').get().then(snapshotAnimal)
      } catch (error) {
        console.log(error);
      }
    }
    guardarProcesando(false);
  }

  function snapshotAnimal(snapshot) {


    let animales = snapshot.docs.map(doc => {
      //Calcula los dias de lactancia
      if (doc.data().estpro != "En Ordeñe") {
        diasLact = 0;
      } else {
        try {
          diasLact = differenceInDays(Date.now(), new Date(doc.data().fparto));
        } catch {
          diasLact = 0;
        }
      }
      return {
        id: doc.id,
        diasLact: diasLact,
        ...doc.data()
      }
    })

    guardarAnimalesBase(animales);

  }

  function aplicarFiltro() {

    let an = animalesBase.filter(animal => {
      return (
        true
      )
    });

    //filtra por RP
    if (rp != "") {
      const cond = rp.toLowerCase();
      an = an.filter(animal => {
        return (
          (animal.rp) && (animal.erp) ?
            animal.rp.toString().toLowerCase().includes(cond) ||
            animal.erp.toString().toLowerCase().includes(cond)
            :
            (animal.rp) ?
              animal.rp.toString().toLowerCase().includes(cond)
              :
              (animal.erp) &&
              animal.erp.toString().toLowerCase().includes(cond)

        )
      });

    }
    //Filtro por estado productivo
    if (estpro != "todos") {
      const cond = estpro.toLowerCase();
      an = an.filter(animal => {
        return (
          animal.estpro.toLowerCase().includes(cond)
        )
      });

    }
    //Filtro por estado reproductivo
    if (estrep != "todos") {
      const cond = estrep.toLowerCase();
      an = an.filter(animal => {
        return (
          animal.estrep.toLowerCase().includes(cond)
        )
      });

    }
    //Filtro por categoria (grupo de animal)
    if (categoria != "todos") {
      const cond = categoria.toLowerCase();
      an = an.filter(animal => (animal.categoria || '').toLowerCase().includes(cond));
    }
    //Filtro por rodeo
    if (rodeo != 0) {
      an = an.filter(animal => {
        if (animal.rodeo != rodeo) return false;
        return animal;

      });

    }
    // Filtro por grupo
    if (valores.grupo !== 'todos') {
      const gsel = Number(valores.grupo);
      an = an.filter(animal => Number(animal.grupo) === gsel);
    }
    guardarAnimales(an);

  }

  function obtenerRodeos() {
    guardarProcesando(true);
    if (tamboSel) {
      firebase.db.collection('parametro').where('idtambo', '==', tamboSel.id).orderBy('orden').get().then(snapshotRodeo)
    }
    guardarProcesando(false);
  }

  function snapshotRodeo(snapshot) {

    const parametros = snapshot.docs.map(doc => {
      return {
        id: doc.id,
        ...doc.data()
      }
    })

    //elimina duplicados
    let anterior = 0;
    let rodeos = [];
    parametros.forEach(p => {

      if (anterior != p.orden) {
        anterior = p.orden;
        rodeos.push(p.orden);
      }

    });

    guardarRodeos(rodeos);

  }

  // Obtiene la lista de grupos definidos en la colección 'parametro' (nueva estructura)
  async function obtenerGrupos() {
    if (!tamboSel) return;
    try {
      const snap = await firebase.db
        .collection('parametro')
        .where('idtambo', '==', tamboSel.id)
        .get();
      const gruposVals = snap.docs
        .map(d => d.data()?.grupo)
        .filter(g => Number.isFinite(Number(g)))
        .map(g => Number(g))
        .sort((a, b) => a - b)
        .filter((g, idx, arr) => idx === 0 || g !== arr[idx - 1]);
      guardarGrupos(gruposVals);
    } catch (e) {
      console.log('Error obteniendo grupos', e);
      guardarGrupos([]);
    }
  }


  const handleClickRP = e => {
    e.preventDefault();
    if (orderRp == 'asc') {
      const a = animalesBase.sort((a, b) => (a.rp < b.rp) ? 1 : -1);
      guardarOrderRp('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (a.rp > b.rp) ? 1 : -1);
      guardarOrderRp('asc');
      guardarAnimalesBase(b);
    }

    aplicarFiltro();

  }

  const handleClickER = e => {
    e.preventDefault();
    if (orderEr == 'asc') {
      const a = animalesBase.sort((a, b) => (a.estrep < b.estrep) ? 1 : -1);
      guardarOrderEr('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (a.estrep > b.estrep) ? 1 : -1);
      guardarOrderEr('asc');
      guardarAnimalesBase(b);
    }

    aplicarFiltro();

  }

  const handleClickEP = e => {
    e.preventDefault();
    if (orderEp == 'asc') {
      const a = animalesBase.sort((a, b) => (a.estpro < b.estpro) ? 1 : -1);
      guardarOrderEp('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (a.estpro > b.estpro) ? 1 : -1);
      guardarOrderEp('asc');
      guardarAnimalesBase(b);
    }

    aplicarFiltro();

  }

  const handleClickGr = e => {
    e.preventDefault();
    if (orderGr == 'asc') {
      const a = animalesBase.sort((a, b) => (a.categoria < b.categoria) ? 1 : -1);
      guardarOrderGr('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (a.categoria > b.categoria) ? 1 : -1);
      guardarOrderGr('asc');
      guardarAnimalesBase(b);
    }

    aplicarFiltro();

  }

  const handleClickRo = e => {
    e.preventDefault();
    if (orderRo == 'asc') {
      const a = animalesBase.sort((a, b) => (a.rodeo < b.rodeo) ? 1 : -1);
      guardarOrderRo('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (a.rodeo > b.rodeo) ? 1 : -1);
      guardarOrderRo('asc');
      guardarAnimalesBase(b);
    }

    aplicarFiltro();

  }

  const handleClickLact = e => {
    e.preventDefault();
    if (orderLact == 'asc') {
      const a = animalesBase.sort((a, b) => (parseInt(a.lactancia) < parseInt(b.lactancia)) ? 1 : -1);
      guardarOrderLact('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (parseInt(a.lactancia) > parseInt(b.lactancia)) ? 1 : -1);
      guardarOrderLact('asc');
      guardarAnimalesBase(b);
    }
    aplicarFiltro();
  }


  const handleClickUC = e => {
    e.preventDefault();
    if (orderUC == 'asc') {
      const a = animalesBase.sort((a, b) => (parseFloat(a.uc) < parseFloat(b.uc)) ? 1 : -1);
      guardarOrderUC('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (parseFloat(a.uc) > parseFloat(b.uc)) ? 1 : -1);
      guardarOrderUC('asc');
      guardarAnimalesBase(b);
    }
    aplicarFiltro();
  }

  const handleClickCA = e => {
    e.preventDefault();
    if (orderCA == 'asc') {
      const a = animalesBase.sort((a, b) => (parseFloat(a.ca) < parseFloat(b.ca)) ? 1 : -1);
      guardarOrderCA('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (parseFloat(a.ca) > parseFloat(b.ca)) ? 1 : -1);
      guardarOrderCA('asc');
      guardarAnimalesBase(b);
    }
    aplicarFiltro();
  }

  const handleClickDl = e => {
    e.preventDefault();
    if (orderDl == 'asc') {
      const a = animalesBase.sort((a, b) => (parseInt(a.diasLact) < parseInt(b.diasLact)) ? 1 : -1);
      guardarOrderDl('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (parseInt(a.diasLact) > parseInt(b.diasLact)) ? 1 : -1);
      guardarOrderDl('asc');
      guardarAnimalesBase(b);
    }
    aplicarFiltro();
  }

  const handleClickRac = e => {
    e.preventDefault();
    if (orderRac == 'asc') {
      const a = animalesBase.sort((a, b) => (parseInt(a.racion) < parseInt(b.racion)) ? 1 : -1);
      guardarOrderRac('desc');
      guardarAnimalesBase(a);
    } else {
      const b = animalesBase.sort((a, b) => (parseInt(a.racion) > parseInt(b.racion)) ? 1 : -1);
      guardarOrderRac('asc');
      guardarAnimalesBase(b);
    }
    aplicarFiltro();
  }

  return (
    <Layout titulo="Reportes">
      <>
        <Botonera>
          <div className={styles.header}>
            <h1>Gral Animales</h1>
            <p>Visualice y administre el listado general de animales de su tambo. (Total: <strong>{animales.length}</strong>)</p>
          </div>
          <Row>
            <Col lg={true}><h6>&nbsp;</h6></Col>
            <Col lg={true}><h6>&nbsp;</h6></Col>
            <Col lg={true}><h6>&nbsp;</h6></Col>
            <Col lg={true}><h6>&nbsp;</h6></Col>
            <Col lg={true}><h6>&nbsp;</h6></Col>
            <Col lg={true}><h6>&nbsp;</h6></Col>

            {animales.length > 0 ? (
              <Col lg={true}>
                {(() => {
                  // 📅 Fecha actual formateada (YYYY-MM-DD)
                  const fechaActual = new Date().toISOString().slice(0, 10);

                  // 🧭 Construir parte del nombre según filtro activo
                  let filtroActivo = "";
                  if (rp && rp.trim() !== "") filtroActivo = `_RP-${rp.trim().replace(/\s+/g, "")}`;
                  else if (valores.categoria !== "todos") filtroActivo = `_Cat-${valores.categoria}`;
                  else if (valores.grupo !== "todos") filtroActivo = `_Grupo-${valores.grupo}`;
                  else if (valores.rodeo !== 0) filtroActivo = `_Rodeo-${valores.rodeo}`;
                  else if (valores.estrep !== "todos") filtroActivo = `_EstRep-${valores.estrep}`;
                  else if (valores.estpro !== "todos") filtroActivo = `_EstPro-${valores.estpro}`;

                  // 🧾 Nombre final del archivo
                  const nombreArchivo = `GrlAnimales${filtroActivo}_${fechaActual}`;

                  return (
                    <ExcelFile
                      element={
                        <Button
                          variant="success"
                          type="button"
                          block
                          className={styles.botonExcel}
                        >
                          Excel
                        </Button>
                      }
                      filename={nombreArchivo}
                    >
                      <ExcelSheet data={animales} name="GrlAnimales">
                        <ExcelColumn label="RP" value="rp" />
                        <ExcelColumn label="eRP" value="erp" />
                        <ExcelColumn label="Grupo" value="grupo" />
                        <ExcelColumn label="Categoria" value="categoria" />
                        <ExcelColumn label="Rodeo" value="rodeo" />
                        <ExcelColumn label="Est.Rep." value="estrep" />
                        <ExcelColumn label="Est.Prod." value="estpro" />
                        <ExcelColumn label="Nro.Lact." value="lactancia" />
                        <ExcelColumn label="Le.UC" value="uc" />
                        <ExcelColumn label="Le.CA" value="ca" />
                        <ExcelColumn label="Dias Lact." value="diasLact" />
                        <ExcelColumn label="Ración(Kg)" value="racion" />
                        <ExcelColumn label="N°Serv." value="nservicio" />
                        <ExcelColumn label="F.Serv." value="fservicio" />
                      </ExcelSheet>
                    </ExcelFile>
                  );
                })()}
              </Col>
            ) : (
              <Col lg={true}></Col>
            )}
          </Row>

          <Row className={styles.filtrosRow}>
            <Col lg={true}>
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col lg={true}>
                    <Form.Group>
                      <Form.Label className={styles.filtroLabel}>RP / eRP</Form.Label>
                      <Form.Control
                        type="string"
                        id="rp"
                        placeholder="RP / eRP"
                        name="rp"
                        value={rp}
                        onChange={handleChange}
                        className={styles.filtroInput}
                      />
                    </Form.Group>
                  </Col>
                  <Col lg={true}>
                    <Form.Group>
                      <Form.Label className={styles.filtroLabel}>Est. Productivo</Form.Label>
                      <Form.Control
                        as="select"
                        id="estpro"
                        name="estpro"
                        onChange={handleChange}
                        required
                        className={styles.filtroInput}
                      >
                        <option value="todos">Todos</option>
                        <option value="En Ordeñe">En Ordeñe</option>
                        <option value="seca">Seca</option>
                        <option value="cria">Cria</option>
                        <option value="rechazo">Rechazo</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col lg={true}>
                    <Form.Group>
                      <Form.Label className={styles.filtroLabel}>Est. Reprod.</Form.Label>
                      <Form.Control
                        as="select"
                        id="estrep"
                        name="estrep"
                        onChange={handleChange}
                        required
                        className={styles.filtroInput}
                      >
                        <option value="todos">Todas</option>
                        <option value="preñada">Preñadas</option>
                        <option value="vacia">Vacias</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col lg={true}>
                    <Form.Group>
                      <Form.Label className={styles.filtroLabel}>Grupo</Form.Label>
                      <Form.Control
                        as="select"
                        id="grupo"
                        name="grupo"
                        onChange={handleChange}
                        value={valores.grupo}
                        className={styles.filtroInput}
                      >
                        <option value="todos">Todos</option>
                        {grupos.length !== 0 &&
                          grupos.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col lg={true}>
                    <Form.Group>
                      <Form.Label className={styles.filtroLabel}>Categoria</Form.Label>
                      <Form.Control
                        as="select"
                        id="categoria"
                        name="categoria"
                        onChange={handleChange}
                        required
                        className={styles.filtroInput}
                      >
                        <option value="todos">Todas</option>
                        <option value="vaca">Vacas</option>
                        <option value="vaquillona">Vaquillonas</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                  <Col lg={true}>
                    <Form.Group>
                      <Form.Label className={styles.filtroLabel}>Rodeo</Form.Label>
                      <Form.Control
                        as="select"
                        id="rodeo"
                        name="rodeo"
                        onChange={handleChange}
                        required
                        className={styles.filtroInput}
                      >
                        <option value="0">Todos</option>
                        {rodeos.length !== 0 &&
                          rodeos.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                      </Form.Control>
                    </Form.Group>
                  </Col>

                  <Col lg={true}>
                    <h5>&nbsp;</h5>
                    <Form.Group>
                      <Button
                        variant="info"
                        type="submit"
                        block
                        className={styles.botonBuscar}
                      >
                        <RiSearchLine size={22} />
                        &nbsp;
                        Buscar
                      </Button>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Col>
          </Row>
        </Botonera>

        {procesando ? (
          <ContenedorSpinner>
            <Spinner animation="border" variant="info" />
          </ContenedorSpinner>
        ) : tamboSel ? (
          animales.length === 0 ? (
            <Mensaje className={styles.mensajeSinResultados}>
              <div className={styles.mensajeCaja}>
                <h2 className={styles.tituloSinResultados}>Sin resultados</h2>
                <p className={styles.textoSecundario}>
                  Presiona <strong>Buscar</strong> para obtener los animales
                </p>
              </div>
            </Mensaje>
          ) : (
            <Contenedor>
              <StickyTable height={510}>
                <Table responsive>
                  <thead>
                    <tr>
                      <th>
                        <div className={styles.thTooltipWrapper} onClick={handleClickRP}>
                          <span className={styles.thContent}>
                            RP
                            <FaSort size={15} className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Caravana</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            eRP<p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Boton Electronico</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} onClick={handleClickGr}>
                          <span className={styles.thContent}>
                            Grupo <FaSort size={15} className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Grupo Animal</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} onClick={handleClickGr}>
                          <span className={styles.thContent}>
                            Categoria <FaSort size={15} className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Categoria</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} onClick={handleClickRo}>
                          <span className={styles.thContent}>
                            Rodeo <FaSort size={15} className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Tipo Rodeo</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} onClick={handleClickER}>
                          <span className={styles.thContent}>
                            Est. Rep. <FaSort size={15} className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Estado Reproductivo</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} onClick={handleClickEP}>
                          <span className={styles.thContent}>
                            Est. Prod. <FaSort size={15} className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Estado Reproductivo</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            Lact.<p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Lactancia</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            Le.UC <p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Litros Último Control</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            Le.CA <p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Litros Control Anterior</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            Días Lact.<p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Días en lactancia</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            Ración(Kg)<p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Ración(Kg)</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            N°Serv.<p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Numero de servicio</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            F.Serv.<p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Fecha de servicio</span>
                        </div>
                      </th>
                      <th>
                        <div className={styles.thTooltipWrapper} >
                          <span className={styles.thContent}>
                            Ficha<p className={styles.sortIcon} />
                          </span>
                          <span className={styles.thTooltipText}>Ficha Animal</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {animales.map((a) => (
                      <DetalleGralAnimal key={a.id} animal={a} />
                    ))}
                  </tbody>
                </Table>
              </StickyTable>
            </Contenedor>
          )
        ) : (
          <SelectTambo />
        )}
      </>
    </Layout>
  );

}

export default GralAnimales