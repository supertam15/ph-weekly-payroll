const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { parseZKBioFile } = require('./utils/zkbioParser');
const {
  calculateWeeklyPagibig,
  calculateWeeklyPhilhealth,
  calculateWeeklySSS,
  calculateWeeklyTax
} = require('./utils/phCalculations');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory Employee Masterlist
let employees = [
  { id: '1001', name: 'Juan Dela Cruz', dailyRate: 645.00 }, // NCR min wage
  { id: '1002', name: 'Maria Santos', dailyRate: 850.00 },
  { id: '1003', name: 'Pedro Penduko', dailyRate: 750.00 }
];

// GET: Employees
app.get('/api/employees', (req, res) => {
  res.json(employees);
});

// POST: Add Employee
app.post('/api/employees', (req, res) => {
  const { id, name, dailyRate } = req.body;
  if (!id || !name || !dailyRate) {
    return res.status(400).json({ error: 'Missing required employee fields' });
  }
  employees.push({ id: id.toString(), name, dailyRate: parseFloat(dailyRate) });
  res.json({ success: true, employees });
});

// POST: Upload ZKBio Zlink Attendance and calculate weekly payroll
app.post('/api/payroll/calculate', upload.single('attendanceFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No attendance file uploaded' });
    }

    const attendanceMap = await parseZKBioFile(req.file.path);
    // Cleanup temporary file
    fs.unlinkSync(req.file.path);

    const payrollRun = employees.map(emp => {
      const att = attendanceMap[emp.id] || { regularHours: 40, otHours: 0, lateMinutes: 0 };
      const hourlyRate = emp.dailyRate / 8;

      // Earnings
      const basicPay = Number((att.regularHours * hourlyRate).toFixed(2));
      const otRate = hourlyRate * 1.25; // DOLE Regular OT is 125%
      const otPay = Number((att.otHours * otRate).toFixed(2));
      const grossPay = basicPay + otPay;

      // Late / Undertime Deduction
      const lateRate = hourlyRate / 60;
      const lateDeduction = Number((att.lateMinutes * lateRate).toFixed(2));

      // Statutory Benefits (EE share)
      const sss = calculateWeeklySSS(grossPay);
      const philhealth = calculateWeeklyPhilhealth(grossPay);
      const pagibig = calculateWeeklyPagibig();
      const totalStatutory = Number((sss + philhealth + pagibig).toFixed(2));

      // Taxable income = Gross - Late - Non-taxable statutory deductions
      const taxableIncome = Math.max(0, grossPay - lateDeduction - totalStatutory);
      const withholdingTax = Number(calculateWeeklyTax(taxableIncome).toFixed(2));

      const totalDeductions = Number((lateDeduction + totalStatutory + withholdingTax).toFixed(2));
      const netPay = Number((grossPay - totalDeductions).toFixed(2));

      return {
        empId: emp.id,
        name: emp.name,
        dailyRate: emp.dailyRate,
        hourlyRate: Number(hourlyRate.toFixed(2)),
        regularHours: att.regularHours,
        otHours: att.otHours,
        lateMinutes: att.lateMinutes,
        basicPay,
        otPay,
        grossPay,
        lateDeduction,
        sss,
        philhealth,
        pagibig,
        totalStatutory,
        withholdingTax,
        totalDeductions,
        netPay
      };
    });

    res.json({ success: true, payroll: payrollRun });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process attendance file' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Philippine Weekly Payroll running on http://localhost:${PORT}`);
});