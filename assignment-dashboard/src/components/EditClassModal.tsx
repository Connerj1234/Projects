'use client';

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useColorModeValue,
  useToast,
  VStack,
  IconButton,
  HStack,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { HexColorPicker } from 'react-colorful';
import { useState } from 'react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import useStore from '@/store/useStore';

export function EditClassModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    classes,
    addClass,
    updateClassColor,
    removeClass,
    filterOptions,
  } = useStore();

  const semesterId = filterOptions.selectedSemester;
  const semesterClasses = classes.filter((c) => c.semesterId === semesterId);

  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#3182CE');
  const [selectedClassForColor, setSelectedClassForColor] = useState<string | null>(null);

  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900');
  const placeholderColor = useColorModeValue('gray.500', 'whiteAlpha.400');

  const handleAddClass = () => {
    if (!newClassName.trim()) return;

    const id = newClassName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    addClass({
      id,
      name: newClassName.trim(),
      color: newClassColor,
      semesterId: semesterId || '',
    });

    toast({
      title: 'Class added',
      description: `Successfully added ${newClassName}`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });

    setNewClassName('');
    setNewClassColor('#3182CE');
  };

  const handleDeleteClass = (id: string) => {
    removeClass(id);
    toast({
      title: 'Class deleted',
      description: 'Class removed successfully',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader color={textColor}>Manage Classes</ModalHeader>
        <ModalCloseButton color={textColor} />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel color={textColor}>Add New Class</FormLabel>
              <InputGroup>
                <Input
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Enter class name"
                  bg={bgColor}
                  borderColor={borderColor}
                  color={textColor}
                  _placeholder={{ color: placeholderColor }}
                />
                <InputRightElement width="4.5rem">
                  <HStack spacing={1}>
                    <IconButton
                      aria-label="Pick class color"
                      icon={
                        <Box
                          w="3"
                          h="3"
                          borderRadius="full"
                          bg={newClassColor}
                          border="1px solid"
                          borderColor={borderColor}
                        />
                      }
                      onClick={() => setSelectedClassForColor('new')}
                      size="sm"
                    />
                    <IconButton
                      icon={<AddIcon />}
                      aria-label="Add class"
                      onClick={handleAddClass}
                      size="sm"
                      isDisabled={!newClassName.trim()}
                    />
                  </HStack>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Box mt={6}>
              <Text fontWeight="medium" color={textColor} mb={2}>
                Existing Classes
              </Text>
              <VStack spacing={3} align="stretch">
                {semesterClasses.map((c) => (
                  <HStack key={c.id} justify="space-between">
                    <HStack>
                      <Box
                        w="4"
                        h="4"
                        borderRadius="full"
                        bg={c.color}
                        border="1px solid"
                        borderColor={borderColor}
                        cursor="pointer"
                        onClick={() => setSelectedClassForColor(c.id)}
                      />
                      <Text color={textColor}>{c.name}</Text>
                    </HStack>
                    <IconButton
                      icon={<DeleteIcon />}
                      aria-label="Delete class"
                      onClick={() => handleDeleteClass(c.id)}
                      size="sm"
                      variant="ghost"
                    />
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} color={textColor}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>

      {/* Color Picker Modal */}
      <Modal isOpen={!!selectedClassForColor} onClose={() => setSelectedClassForColor(null)}>
        <ModalOverlay />
        <ModalContent bg={bgColor}>
          <ModalHeader color={textColor}>Choose Class Color</ModalHeader>
          <ModalCloseButton color={textColor} />
          <ModalBody>
            <HexColorPicker
              color={
                selectedClassForColor === 'new'
                  ? newClassColor
                  : classes.find((c) => c.id === selectedClassForColor)?.color || '#3182CE'
              }
              onChange={(color) => {
                if (selectedClassForColor === 'new') {
                  setNewClassColor(color);
                } else if (selectedClassForColor) {
                  updateClassColor(selectedClassForColor, color);
                }
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setSelectedClassForColor(null)} color={textColor}>
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Modal>
  );
}
