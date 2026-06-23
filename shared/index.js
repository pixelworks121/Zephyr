const { LEAD_STATUSES, LEAD_STATUS_LABELS } = require('./constants/leadStatuses');
const { INDUSTRIES } = require('./constants/industries');
const { formatDate } = require('./utils/formatDate');
const { slugify } = require('./utils/slugify');

module.exports = {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  INDUSTRIES,
  formatDate,
  slugify,
};
