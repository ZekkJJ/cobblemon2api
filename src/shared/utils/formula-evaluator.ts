/**
 * Formula Evaluator - Safe Math Expression Evaluation
 * Cobblemon Los Pitufos - Backend API
 * 
 * Replaces dangerous eval() with safe mathjs library
 * to prevent code injection vulnerabilities.
 */

import * as mathjs from 'mathjs';
import { Errors } from '../middleware/error-handler.js';

// Use mathjs directly for safe evaluation
const math = mathjs;

// Whitelist of allowed functions and operators
const ALLOWED_FUNCTIONS = new Set([
  'add', 'subtract', 'multiply', 'divide', 'mod',
  'min', 'max', 'floor', 'ceil', 'round', 'abs',
  'sqrt', 'pow', 'exp', 'log', 'log10',
  'sin', 'cos', 'tan', // Trigonometric (rarely needed but safe)
]);

const ALLOWED_OPERATORS = new Set([
  '+', '-', '*', '/', '%', '(', ')', ',', ' '
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class FormulaEvaluator {
  /**
   * Validates a formula for safety before evaluation
   */
  static validate(formula: string): ValidationResult {
    if (!formula || typeof formula !== 'string') {
      return { valid: false, error: 'Formula must be a non-empty string' };
    }

    // Check for dangerous keywords
    const dangerousKeywords = [
      'eval', 'function', 'Function', 'require', 'import', 'export',
      'process', 'global', 'window', 'document', '__proto__', 'constructor',
      'prototype', 'this', 'return', 'while', 'for', 'if', 'else'
    ];

    const lowerFormula = formula.toLowerCase();
    for (const keyword of dangerousKeywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (lowerFormula.includes(lowerKeyword)) {
        return { 
          valid: false, 
          error: `Forbidden keyword detected: ${keyword}` 
        };
      }
    }

    // Check for method calls (e.g., obj.method())
    if (/\.\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/.test(formula)) {
      return { 
        valid: false, 
        error: 'Method calls are not allowed' 
      };
    }

    // Check for property access (except allowed variables)
    const allowedVariables = ['badges', 'playtime', 'level'];
    const propertyAccessRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\./g;
    let match;
    while ((match = propertyAccessRegex.exec(formula)) !== null) {
      const varName = match[1];
      if (varName && !allowedVariables.includes(varName)) {
        return { 
          valid: false, 
          error: `Property access not allowed: ${varName}` 
        };
      }
    }

    // Try to parse with mathjs to check syntax
    try {
      // Replace variables with dummy values for syntax check
      const testFormula = formula
        .replace(/badges/g, '1')
        .replace(/playtime/g, '1')
        .replace(/level/g, '1');
      
      math.evaluate(testFormula);
    } catch (error: any) {
      return { 
        valid: false, 
        error: `Invalid formula syntax: ${error.message}` 
      };
    }

    return { valid: true };
  }

  /**
   * Safely evaluates a formula with given context variables
   */
  static evaluate(
    formula: string, 
    context: { badges?: number; playtime?: number; level?: number }
  ): number {
    // Validate first
    const validation = this.validate(formula);
    if (!validation.valid) {
      throw Errors.validationError(validation.error || 'Invalid formula');
    }

    try {
      // Prepare scope with context variables
      const scope = {
        badges: context.badges || 0,
        playtime: context.playtime || 0,
        level: context.level || 1,
      };

      // Evaluate using mathjs
      const result = math.evaluate(formula, scope);

      // Ensure result is a valid number
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        console.warn('[FORMULA EVALUATOR] Invalid result:', result);
        return Infinity;
      }

      // Return floored positive integer
      return Math.max(0, Math.floor(result));
    } catch (error: any) {
      console.error('[FORMULA EVALUATOR] Evaluation error:', error);
      throw Errors.validationError(`Formula evaluation failed: ${error.message}`);
    }
  }

  /**
   * Evaluates a formula and returns Infinity on error (for backward compatibility)
   */
  static evaluateSafe(
    formula: string,
    context: { badges?: number; playtime?: number; level?: number }
  ): number {
    try {
      return this.evaluate(formula, context);
    } catch (error) {
      console.warn('[FORMULA EVALUATOR] Safe evaluation returned Infinity due to error');
      return Infinity;
    }
  }
}
