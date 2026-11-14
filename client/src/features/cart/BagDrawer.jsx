import { Drawer } from '../../components/ui/Drawer';
import { useUi } from '../../stores/ui.store';
import { Bag } from './Bag';

export function BagDrawer() {
  const open = useUi((state) => state.bagOpen);
  const close = useUi((state) => state.closeBag);

  return (
    <Drawer open={open} onClose={close} title="Your bag">
      <Bag inDrawer closeDrawer={close} />
    </Drawer>
  );
}
