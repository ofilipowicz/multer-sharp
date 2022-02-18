import { lookup } from 'mime-types';

export default (format) => {
  if (typeof format === 'object' && Object.prototype.hasOwnProperty.call(format, 'type')) {
    return lookup(format.type);
  }
  return lookup(format);
};
