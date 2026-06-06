package com.payroll.salarystep

import com.payroll.jobgrade.JobGrade
import org.springframework.data.jpa.repository.JpaRepository
import java.util.Optional
import java.util.UUID

interface SalaryStepRepository : JpaRepository<SalaryStep, UUID> {
    fun findByJobGrade(jobGrade: JobGrade): List<SalaryStep>
    fun findByJobGradeAndStepAndApplyYear(jobGrade: JobGrade, step: Int, applyYear: Int): Optional<SalaryStep>
    fun findByJobGradeAndApplyYear(jobGrade: JobGrade, applyYear: Int): List<SalaryStep>
}
