/**
 * Plugin that intercepts link clicks and shows a confirmation dialog
 */

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { CLICK_COMMAND } from 'lexical';
import { useEffect, useState } from 'react';
import GenericModal from '@/components/shared/GenericModal';
import ModalActions from '@/components/shared/ModalActions';

export default function LinkClickPlugin(): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();
  const [linkModal, setLinkModal] = useState<{ isOpen: boolean; href: string }>({
    isOpen: false,
    href: '',
  });

  useEffect(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      (payload: PointerEvent) => {
        const target = payload.target as HTMLElement;

        // Check if the clicked element is a link
        let linkElement: HTMLAnchorElement | null = null;
        if (target.tagName === 'A') {
          linkElement = target as HTMLAnchorElement;
        } else {
          linkElement = target.closest('a') as HTMLAnchorElement;
        }

        if (!linkElement) return false;

        const href = linkElement.getAttribute('href');
        if (!href) return false;

        // Prevent default link behaviour
        payload.preventDefault();

        // Show confirmation dialog
        setLinkModal({ isOpen: true, href });

        return true;
      },
      1
    );
  }, [editor]);

  const handleOpenLink = () => {
    window.open(linkModal.href, '_blank', 'noopener,noreferrer');
    setLinkModal({ ...linkModal, isOpen: false });
  };

  const handleCloseModal = () => {
    setLinkModal({ ...linkModal, isOpen: false });
  };

  return (
    <GenericModal
      isOpen={linkModal.isOpen}
      onClose={handleCloseModal}
      title="Open Link"
      closeOnClickOutside={true}
    >
      <div style={{ fontSize: '14px' }}>
        <p>Do you want to open this link?</p>
        <p style={{ wordBreak: 'break-all', color: '#666', fontSize: '12px', marginTop: '8px' }}>
          {linkModal.href}
        </p>
        <ModalActions
          actions={[
            { label: 'Open', onClick: handleOpenLink, variant: 'primary' },
            { label: 'Cancel', onClick: handleCloseModal },
          ]}
        />
      </div>
    </GenericModal>
  );
}
