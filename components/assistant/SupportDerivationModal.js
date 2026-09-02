import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useAssistant } from './AssistantContext';

const FUNCTION_URL =
  process.env.NEXT_PUBLIC_CREATE_SUPPORT_TICKET_URL ||
  'https://us-central1-farmerin-navarro.cloudfunctions.net/createSupportTicket';

const SupportDerivationModal = () => {
  const { isSupportModalOpen, setIsSupportModalOpen, context } = useAssistant();



  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [accion, setAccion] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errorVisible, setErrorVisible] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (isSupportModalOpen) {
      if (context?.usuario) {
        if (!nombreUsuario) {
          setNombreUsuario(context.usuario.displayName || context.usuario.email || '');
        }
        if (!email) {
          setEmail(context.usuario.email || '');
        }
      }
    }
  }, [isSupportModalOpen, context, nombreUsuario, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const valorNombreUsuario = nombreUsuario || context?.usuario?.displayName || context?.usuario?.email || 'Usuario';
    const valorEmail = context?.usuario?.email || email || '';

    const payload = {
      nombreUsuario: valorNombreUsuario,
      userId: valorNombreUsuario,
      user_id: valorNombreUsuario,
      usuario: valorNombreUsuario,
      userName: valorNombreUsuario,
      displayName: valorNombreUsuario,
      contacto: valorEmail,
      email: valorEmail,
      accion,
      descripcion,
      errorVisible,
      section: context?.sectionTitle || context?.section || 'General',
      tambo: context?.tamboName || 'Ninguno seleccionado',
      path: context?.path || '/'
    };

    setIsSubmitting(true);

    try {
      const response = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        data = null;
      }

      if (!response.ok || (data && data.success === false)) {
        const errorMsg =
          (data && data.message) ||
          'Ocurrió un inconveniente al registrar la consulta. Por favor, intentá nuevamente.';
        setSubmitError(errorMsg);
        setIsSubmitting(false);
        return;
      }

      const createdTicketId = (data && data.ticketId) || null;
      setTicketId(createdTicketId);
      setSubmitted(true);
      setIsSubmitting(false);

      setAccion('');
      setDescripcion('');
      setErrorVisible('');
      if (!context?.usuario) {
        setEmail('');
        setNombreUsuario('');
      }

      setTimeout(() => {
        setSubmitted(false);
        setTicketId(null);
        setIsSupportModalOpen(false);
      }, 2500);
    } catch (err) {
      console.error('Error al enviar consulta a soporte:', err);
      setSubmitError(
        'Ocurrió un error de conexión al enviar tu consulta. Por favor, verificá tu red e intentá nuevamente.'
      );
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setIsSupportModalOpen(false);
    setSubmitted(false);
    setSubmitError(null);
    setTicketId(null);
    setNombreUsuario('');
    setEmail('');
    setAccion('');
    setDescripcion('');
    setErrorVisible('');
  };

  return (
    <Modal show={isSupportModalOpen} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton style={{ background: '#1b365d', color: '#ffffff' }}>
        <Modal.Title style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Derivar a Soporte Técnico - Farmerin
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px' }}>
        {submitted ? (
          <Alert variant="success" style={{ textAlign: 'center', margin: '20px 0' }}>
            <h4>¡Ticket de Soporte Enviado!</h4>
            <p>
              {ticketId
                ? `Ticket #${ticketId} de tambo ${context?.tamboName || ''}`
                : 'Hemos recopilado el contexto de tu consulta. Un especialista técnico revisará tu caso a la brevedad.'}
            </p>
          </Alert>
        ) : (
          <Form onSubmit={handleSubmit}>
            {submitError && (
              <Alert variant="danger" dismissible onClose={() => setSubmitError(null)}>
                {submitError}
              </Alert>
            )}

            {/* Contexto automático: solo se muestra si hay un usuario logueado */}
            {context?.usuario && (
              <div
                style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <strong style={{ fontSize: '13px', color: '#475569' }}>
                  Contexto recopilado automáticamente:
                </strong>
                <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#1e293b' }}>
                  {(context?.usuario || nombreUsuario) && (
                    <li>
                      <strong>Nombre de usuario:</strong> {nombreUsuario || context?.usuario?.displayName || context?.usuario?.email}
                    </li>
                  )}
                  {(context?.usuario?.email || email) && (
                    <li>
                      <strong>Correo de contacto:</strong> {context?.usuario?.email || email}
                    </li>
                  )}
                  <li>
                    <strong>Sección actual:</strong> {context?.sectionTitle || context?.section}
                  </li>
                  <li>
                    <strong>Tambo seleccionado:</strong> {context?.tamboName || 'Ninguno seleccionado'}
                  </li>
                  <li>
                    <strong>Pantalla / Ruta:</strong> {context?.path}
                  </li>
                </ul>
              </div>
            )}

            {/* Campo Nombre de usuario / Nombre y Apellido */}
            <Form.Group controlId="formNombreUsuario" className="mb-3">
              <Form.Label style={{ fontWeight: '600', fontSize: '14px' }}>
                {context?.usuario ? 'Nombre de usuario' : 'Nombre y Apellido'}
              </Form.Label>
              <Form.Control
                type="text"
                placeholder={context?.usuario ? 'Nombre de usuario' : 'Ingresá tu nombre y apellido'}
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </Form.Group>

            {/* Campo Email de contacto (Solo si no está logueado) */}
            {!context?.usuario && (
              <Form.Group controlId="formEmail" className="mb-3">
                <Form.Label style={{ fontWeight: '600', fontSize: '14px' }}>Correo electrónico de contacto</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Ej. nombre@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </Form.Group>
            )}

            <Form.Group controlId="formAccion" className="mb-3">
              <Form.Label style={{ fontWeight: '600', fontSize: '14px' }}>¿Qué intentabas hacer?</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej. Consultar horarios de ordeñe, crear un tambo, etc."
                value={accion}
                onChange={(e) => setAccion(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </Form.Group>

            <Form.Group controlId="formDescripcion" className="mb-3">
              <Form.Label style={{ fontWeight: '600', fontSize: '14px' }}>
                Descripción del problema / qué ocurrió
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Detallá lo que sucedió o lo que necesitas consultar..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </Form.Group>

            <Form.Group controlId="formErrorVisible" className="mb-3">
              <Form.Label style={{ fontWeight: '600', fontSize: '14px' }}>
                Mensaje de error visible (opcional)
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Ej. 'Cargando Panel...', cartel rojo de validación, etc."
                value={errorVisible}
                onChange={(e) => setErrorVisible(e.target.value)}
                disabled={isSubmitting}
              />
            </Form.Group>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: '#297fb8', borderColor: '#297fb8' }}
              >
                {isSubmitting ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      style={{ marginRight: '6px' }}
                    />
                    Enviando...
                  </>
                ) : (
                  'Enviar Consulta a Soporte'
                )}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default SupportDerivationModal;

