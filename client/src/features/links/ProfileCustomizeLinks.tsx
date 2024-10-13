import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { HiOutlinePlus } from "react-icons/hi2";
import { useLinks } from "../../contexts/LinksContext";
import EmptyLinksBox from "./EmptyLinksBox";
import LinkItems from "./LinkItems";

function ProfileCustomizeLinks({ isCreating }: { isCreating: boolean }) {
  const { links, addLink, setLinks } = useLinks();

  function getLinksPosition(id: number): number {
    return links.findIndex((link) => link.id === id);
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const originalPosition = getLinksPosition(+active.id);
    const newPosition = getLinksPosition(+over.id);

    const updatedLinks = arrayMove(links, originalPosition, newPosition);
    setLinks(updatedLinks);
  }

  return (
    <div className="flex flex-col bg-white px-14 py-12 pb-0 mobile:p-[2.4rem] mobile:pb-0">
      <h1 className="block pb-[0.8rem] text-[3.1rem] font-bold leading-[4.8rem] text-[#333] tablet:hidden mobile:text-[2.4rem] mobile:leading-[3.5rem]">
        Customize your links
      </h1>
      <h3 className="block pb-16 text-[1.6rem] leading-[2.4rem] text-[#737373] tablet:hidden">
        Add/edit/remove links below and then share all your profiles with the
        world!
      </h3>
      <button
        className="mb-[2.4rem] flex items-center justify-center gap-[0.8rem] rounded-[0.8rem] border border-solid border-[#633cff] px-11 py-4 text-[1.6rem] font-medium leading-[2.4rem] text-[#633cff] hover:bg-[#efebff] disabled:cursor-not-allowed disabled:border-[#ccc] disabled:bg-[#ccc] disabled:text-[#666]"
        onClick={() => addLink("Github", "", Date.now())}
        disabled={links.length === 5}
      >
        <HiOutlinePlus />
        <span>Add link</span>
      </button>

      <DndContext
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        {links.length > 0 ? (
          <SortableContext items={links} strategy={verticalListSortingStrategy}>
            {links.map((link, index) => (
              <LinkItems
                key={index}
                index={index}
                link={link}
                number={index + 1}
                isCreating={isCreating}
              />
            ))}
          </SortableContext>
        ) : (
          <EmptyLinksBox />
        )}
      </DndContext>
    </div>
  );
}

export default ProfileCustomizeLinks;
