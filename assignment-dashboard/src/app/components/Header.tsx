// Combined Header + Controls Layout Redesign
import {
    Box,
    Button,
    Flex,
    HStack,
    IconButton,
    Select,
    Switch,
    Text,
    useColorMode,
    useColorModeValue,
    useDisclosure,
  } from '@chakra-ui/react';
  import { MoonIcon, SunIcon, AddIcon } from '@chakra-ui/icons';
  import useStore from '@/store/useStore';
  import { NewAssignmentModal } from '@/components/NewAssignmentModal';
  import { SemesterModal } from '@/components/SemesterModal';
  import { EditSemesterModal } from '@/components/EditSemesterModal';
  import { EditClassModal } from '@/components/EditClassModal';
  import { EditTypeModal } from '@/components/EditTypeModal';
  import { useState } from 'react';
  import { BsList, BsCalendar3 } from 'react-icons/bs';

  export default function DashboardHeader() {
    const {
      filterOptions,
      setFilterOptions,
      semesters,
      setViewMode,
      viewMode,
    } = useStore();

    const { colorMode, toggleColorMode } = useColorMode();
    const bgColor = useColorModeValue('white', 'gray.800');
    const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
    const iconColor = useColorModeValue('gray.600', 'whiteAlpha.900');
    const activeButtonBg = useColorModeValue('blue.500', 'blue.400');
    const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
    const buttonHoverBg = useColorModeValue('gray.100', 'whiteAlpha.300');

    const { isOpen, onOpen, onClose } = useDisclosure();
    const {
      isOpen: isSemesterModalOpen,
      onOpen: onSemesterModalOpen,
      onClose: onSemesterModalClose,
    } = useDisclosure();
    const {
      isOpen: isEditSemesterModalOpen,
      onOpen: onEditSemesterModalOpen,
      onClose: onEditSemesterModalClose,
    } = useDisclosure();
    const {
      isOpen: isManageClassesOpen,
      onOpen: onManageClassesOpen,
      onClose: onManageClassesClose,
    } = useDisclosure();
    const {
      isOpen: isManageTypesOpen,
      onOpen: onManageTypesOpen,
      onClose: onManageTypesClose,
    } = useDisclosure();

    const [selectedSemesterForEdit, setSelectedSemesterForEdit] = useState<string>('');
    const handleEditSemester = (semesterId: string) => {
      setSelectedSemesterForEdit(semesterId);
      onEditSemesterModalOpen();
    };

    return (
      <Box px={8} pt={4} pb={2} bg={bgColor} borderBottomWidth="1px" borderColor={borderColor}>
        {/* Top Row */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <HStack spacing={4}>
            <Select
              maxW="200px"
              value={filterOptions.selectedSemester}
              onChange={(e) => setFilterOptions({ ...filterOptions, selectedSemester: e.target.value })}
              bg={bgColor}
              borderColor={borderColor}
              color={textColor}
            >
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>{semester.name}</option>
              ))}
            </Select>

            <Button variant="outline" onClick={onSemesterModalOpen}>
              + Manage Semesters
            </Button>
          </HStack>

          <HStack spacing={4}>
            <Button colorScheme="blue" onClick={onOpen} leftIcon={<AddIcon />}>New Assignment</Button>
            <IconButton
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              aria-label="Toggle Color Mode"
              onClick={toggleColorMode}
              variant="ghost"
            />
          </HStack>
        </Flex>

        {/* Second Row */}
        <Flex justify="space-between" align="center" mt={4} wrap="wrap" gap={4}>
          <HStack spacing={4}>
            <Text fontWeight="medium" color={textColor}>View:</Text>
            <IconButton
              aria-label="List view"
              icon={<BsList />}
              variant={viewMode === 'list' ? 'solid' : 'ghost'}
              onClick={() => setViewMode('list')}
              color={viewMode === 'list' ? 'white' : iconColor}
              bg={viewMode === 'list' ? activeButtonBg : 'transparent'}
              _hover={{ bg: viewMode === 'list' ? activeButtonBg : buttonHoverBg }}
            />
            <IconButton
              aria-label="Calendar view"
              icon={<BsCalendar3 />}
              variant={viewMode === 'calendar' ? 'solid' : 'ghost'}
              onClick={() => setViewMode('calendar')}
              color={viewMode === 'calendar' ? 'white' : iconColor}
              bg={viewMode === 'calendar' ? activeButtonBg : 'transparent'}
              _hover={{ bg: viewMode === 'calendar' ? activeButtonBg : buttonHoverBg }}
            />
            <HStack>
              <Switch
                isChecked={filterOptions.showCompleted}
                onChange={(e) => setFilterOptions({ ...filterOptions, showCompleted: e.target.checked })}
                colorScheme="blue"
              />
              <Text color={textColor}>Show Completed</Text>
            </HStack>
          </HStack>

          <HStack spacing={2}>
            <Button variant="outline" onClick={onManageClassesOpen}>Manage Classes</Button>
            <Button variant="outline" onClick={onManageTypesOpen}>Manage Types</Button>
          </HStack>
        </Flex>

        {/* Modals */}
        <NewAssignmentModal isOpen={isOpen} onClose={onClose} />
        <SemesterModal isOpen={isSemesterModalOpen} onClose={onSemesterModalClose} />
        <EditSemesterModal
          isOpen={isEditSemesterModalOpen}
          onClose={onEditSemesterModalClose}
          semesterId={selectedSemesterForEdit}
        />
        <EditClassModal isOpen={isManageClassesOpen} onClose={onManageClassesClose} />
        <EditTypeModal isOpen={isManageTypesOpen} onClose={onManageTypesClose} />
      </Box>
    );
  }
