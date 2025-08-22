/**
 * Utilidades de validación para formularios
 */

/**
 * Valida que un campo no esté vacío
 */
export const required = (value, fieldName = 'Campo') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} es requerido`;
  }
  return null;
};

/**
 * Valida que un valor esté en una lista de opciones válidas
 */
export const oneOf = (value, options, fieldName = 'Campo') => {
  if (!options.includes(value)) {
    return `${fieldName} debe ser uno de: ${options.join(', ')}`;
  }
  return null;
};

/**
 * Valida que un string tenga una longitud mínima
 */
export const minLength = (value, min, fieldName = 'Campo') => {
  if (value && value.length < min) {
    return `${fieldName} debe tener al menos ${min} caracteres`;
  }
  return null;
};

/**
 * Valida que un string tenga una longitud máxima
 */
export const maxLength = (value, max, fieldName = 'Campo') => {
  if (value && value.length > max) {
    return `${fieldName} no puede tener más de ${max} caracteres`;
  }
  return null;
};

/**
 * Valida que un valor sea un email válido
 */
export const email = (value, fieldName = 'Email') => {
  if (value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return `${fieldName} debe ser un email válido`;
    }
  }
  return null;
};

/**
 * Ejecuta múltiples validaciones en un campo
 */
export const validate = (value, validators) => {
  for (const validator of validators) {
    const error = validator(value);
    if (error) {
      return error;
    }
  }
  return null;
};

/**
 * Valida un formulario completo
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  
  for (const fieldName in validationRules) {
    const value = formData[fieldName];
    const validators = validationRules[fieldName];
    const error = validate(value, validators);
    
    if (error) {
      errors[fieldName] = error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Reglas de validación para reportes
 */
export const reportValidationRules = {
  sucursal_id: [
    (value) => required(value, 'Sucursal')
  ],
  proveedor: [
    (value) => required(value, 'Proveedor')
  ],
  prioridad: [
    (value) => oneOf(value, ['alta', 'media', 'baja'], 'Prioridad')
  ],
  numero_ticket: [
    (value) => maxLength(value, 100, 'Número de ticket')
  ],
  notas_tecnicas: [
    (value) => maxLength(value, 1000, 'Notas técnicas')
  ]
};
