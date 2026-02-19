
import style from './Modal.module.scss';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className={style["modal-overlay"]} onClick={onClose}>
      <div
        className={style["modal-content"]}
        onClick={e => e.stopPropagation()}
      >
        <div className={style["modal-header"]}>
          <button className={style["modal-close"]} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={style["modal-body"]}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;