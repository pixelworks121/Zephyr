import LeadFormModal from './LeadFormModal';

export default function AddLeadModal({ isOpen, onClose }) {
  return <LeadFormModal isOpen={isOpen} onClose={onClose} mode="create" />;
}
