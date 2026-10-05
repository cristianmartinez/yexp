import { type BytecodeProgram, type Instruction, Opcode } from '@cristianmartinez/yexp';

/** Resolve slot and constant indices without inventing an intermediate instruction set. */
export function formatInstruction(instruction: Instruction, program: BytecodeProgram): string {
  const [opcode, ...operands] = instruction;
  const name = Opcode[opcode];
  const args = operands.map((operand, index) => {
    if ((opcode === Opcode.LOAD || name.startsWith('LOAD_')) && index === 0)
      return program.slots[Number(operand)];
    if (opcode === Opcode.CONST && index === 0)
      return JSON.stringify(program.constants[Number(operand)]);
    return String(operand);
  });
  return [name, ...args].join(' ');
}
