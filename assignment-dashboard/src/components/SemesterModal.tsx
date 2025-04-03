'use client';

import { useState, useRef } from 'react';
import {
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  VStack,
  useColorModeValue,
  useToast,
  Text,
  IconButton,
  Flex,
  useDisclosure,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { v4 as uuidv4 } from 'uuid';
import useStore from '@/store/useStore';
import { format } from 'date-fns';

interface SemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSemesterCreated?: (semesterId: string) => void;
  mode?: 'full' | 'create-only';
}

export function SemesterModal({ isOpen, onClose, onSemesterCreated, mode = 'full' }: SemesterModalProps) {
  const [newSemesterName, setNewSemesterName] = useState('');
  const [newSemesterStartDate, setNewSemesterStartDate] = useState('');
  const [newSemesterEndDate, setNewSemesterEndDate] = useState('');
  const [semesterToDelete, setSemesterToDelete] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(mode === 'create-only');

  const { addSemester, removeSemester, semesters } = useStore();
  const toast = useToast();

  const cancelRef = useRef<HTMLButtonElement>(null);
  const {
    isOpen: isDeleteConfirmOpen,
    onOpen: onOpenDeleteConfirm,
    onClose: onCloseDeleteConfirm,
  } = useDisclosure();

  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const inputBg = useColorModeValue('white', 'whiteAlpha.200');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const labelColor = useColorModeValue('gray.700', 'whiteAlpha.800');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.400');

  const handleCreateSemester = () => {
    if (!newSemesterName.trim() || !newSemesterEndDate) {
      toast({
        title: 'Required fields missing',
        description: 'Please provide both a semester name and end date',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newSemester = {
      id: uuidv4(),
      name: newSemesterName.trim(),
      ...(newSemesterStartDate && { startDate: newSemesterStartDate }),
      endDate: newSemesterEndDate,
    };

    addSemester(newSemester);
    onSemesterCreated?.(newSemester.id);
    setNewSemesterName('');
    setNewSemesterStartDate('');
    setNewSemesterEndDate('');

    if (mode === 'full') {
      setShowCreateForm(false);
    } else {
      onClose();
    }

    toast({
      title: 'Semester created',
      description: `Successfully created ${newSemesterName}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const confirmDeleteSemester = (id: string) => {
    setSemesterToDelete(id);
    onOpenDeleteConfirm();
  };

  const handleDelete = () => {
    if (semesterToDelete) {
      removeSemester(semesterToDelete);
      toast({
        title: 'Semester deleted',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
      setSemesterToDelete(null);
      onCloseDeleteConfirm();
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>
            {showCreateForm ? 'Create New Semester' : 'Manage Semesters'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {!showCreateForm && (
              <>
                <Button
                  colorScheme="blue"
                  mb={4}
                  onClick={() => setShowCreateForm(true)}
                >
                  Create Semester
                </Button>
                <VStack spacing={3} align="stretch">
                  {semesters.map((s) => (
                    <Flex
                      key={s.id}
                      justify="space-between"
                      align="center"
                      borderWidth={1}
                      borderRadius="md"
                      p={3}
                      borderColor={borderColor}
                    >
                      <Box>
                        <Text fontWeight="medium" color={textColor}>{s.name}</Text>
                        <Text fontSize="sm" color={labelColor}>ends on {format(new Date(s.endDate + 'T12:00:00'), 'MMM d, yyyy')}</Text>
                      </Box>
                      <IconButton
                        icon={<DeleteIcon />}
                        aria-label="Delete semester"
                        size="sm"
                        colorScheme="red"
                        onClick={() => confirmDeleteSemester(s.id)}
                      />
                    </Flex>
                  ))}
                </VStack>
              </>
            )}

            {showCreateForm && (
              <VStack spacing={4} mb={6}>
                <FormControl isRequired>
                  <FormLabel color={textColor}>Semester Name</FormLabel>
                  <Input
                    value={newSemesterName}
                    onChange={(e) => setNewSemesterName(e.target.value)}
                    placeholder="e.g., Fall 2024"
                    bg={inputBg}
                    borderColor={borderColor}
                    color={textColor}
                    _placeholder={{ color: placeholderColor }}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color={textColor}>Start Date (Optional)</FormLabel>
                  <Input
                    type="date"
                    value={newSemesterStartDate}
                    onChange={(e) => setNewSemesterStartDate(e.target.value)}
                    bg={inputBg}
                    borderColor={borderColor}
                    color={textColor}
                  />
                  <FormHelperText color={labelColor}>
                    If set, this will appear as an event in your calendar
                  </FormHelperText>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel color={textColor}>End Date</FormLabel>
                  <Input
                    type="date"
                    value={newSemesterEndDate}
                    onChange={(e) => setNewSemesterEndDate(e.target.value)}
                    min={newSemesterStartDate}
                    bg={inputBg}
                    borderColor={borderColor}
                    color={textColor}
                  />
                  <FormHelperText color={labelColor}>
                    This will appear as an event in your calendar
                  </FormHelperText>
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={() => {
                showCreateForm && mode === 'full' ? setShowCreateForm(false) : onClose();
              }}
              color={textColor}
            >
              {showCreateForm && mode === 'full' ? 'Back' : 'Close'}
            </Button>
            {showCreateForm && (
              <Button
                colorScheme="blue"
                onClick={handleCreateSemester}
                isDisabled={!newSemesterName.trim()}
              >
                Create
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteConfirmOpen}
        leastDestructiveRef={cancelRef}
        onClose={onCloseDeleteConfirm}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg={bgColor}>
            <AlertDialogHeader color={textColor}>Delete Semester</AlertDialogHeader>
            <AlertDialogBody color={textColor}>
              Are you sure you want to delete this semester? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onCloseDeleteConfirm} color={textColor}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
