# Deployment Checklist: Approval Screen Enhancements

## 🚀 Pre-Deployment Steps

### 1. Database Migration (CRITICAL - MUST BE FIRST)
- [ ] Open Supabase Dashboard (https://supabase.com/dashboard)
- [ ] Navigate to SQL Editor
- [ ] Copy contents from `database_migration.sql`
- [ ] Execute the SQL script
- [ ] Verify column creation with verification query
- [ ] Expected result: `approved_by_name | text | YES`

**File to execute**: `database_migration.sql`

### 2. Code Review
- [x] All TypeScript types updated
- [x] Service layer updated
- [x] Business logic updated
- [x] UI components updated
- [x] No compilation errors
- [x] HMR working correctly

### 3. Local Testing
- [ ] Run development server (`npm run dev`)
- [ ] Login as admin user
- [ ] Test approval flow (approve a change)
- [ ] Verify approver name appears
- [ ] Test all filters
- [ ] Test CSV export
- [ ] Check browser console for errors

---

## ✅ Post-Deployment Verification

### Database Verification
```sql
-- Run this in Supabase SQL Editor to verify schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'manual_changes'
ORDER BY ordinal_position;
```

Expected columns should include:
- `approved_by_name` (text, nullable)

### Feature Testing

#### 1. Approver Name Display
- [ ] Create test change request as non-admin
- [ ] Login as admin
- [ ] Approve the test request
- [ ] Verify approver name appears in new column
- [ ] Verify approver email displays below name
- [ ] Verify approval date shows correctly
- [ ] Check green shield icon appears
- [ ] Verify unapproved items show "-"

#### 2. Filter Testing
**Status Filter**:
- [ ] Select "Pendente" only → see pending items
- [ ] Select "Aplicado" only → see approved items
- [ ] Select both → see combined results
- [ ] Verify badge count updates

**Type Filter**:
- [ ] Select "CONTA" → see account changes
- [ ] Select "RATEIO" → see allocation changes
- [ ] Select multiple types
- [ ] Verify count badge

**Requester Filter**:
- [ ] Verify dropdown shows requester names (not emails)
- [ ] Select one requester → see their requests only
- [ ] Select multiple requesters
- [ ] Verify yellow highlighting on active filter

**Approver Filter**:
- [ ] Verify dropdown only shows users who approved something
- [ ] Select one approver → see their approvals
- [ ] Verify empty list for new system with no approvals yet

**Date Range Filter**:
- [ ] Set "From" date → see records after that date
- [ ] Set "To" date → see records before that date
- [ ] Set both → see records in range
- [ ] Clear dates → see all records

**Combined Filters**:
- [ ] Apply multiple filters at once
- [ ] Verify all filters work together (AND logic)
- [ ] Check record count summary updates
- [ ] Click "Limpar Filtros" → all reset

#### 3. CSV Export
**Basic Export**:
- [ ] Click "Exportar CSV" button
- [ ] File downloads automatically
- [ ] Filename format: `Aprovacoes_YYYY-MM-DD.csv`
- [ ] Open in Excel
- [ ] Verify 18 columns present
- [ ] Check Portuguese characters display correctly

**Column Verification**:
1. [ ] ID
2. [ ] Solicitante Nome
3. [ ] Solicitante Email
4. [ ] Data Solicitação
5. [ ] Tipo
6. [ ] Status
7. [ ] Transação ID
8. [ ] Descrição Original
9. [ ] Filial Original
10. [ ] Valor Original
11. [ ] Nova Conta
12. [ ] Nova Filial
13. [ ] Nova Data
14. [ ] Nova Recorrência
15. [ ] Justificativa
16. [ ] Aprovador Nome (NEW)
17. [ ] Aprovador Email (NEW)
18. [ ] Data Aprovação (NEW)

**Filtered Export**:
- [ ] Apply filters (e.g., Status = "Aplicado")
- [ ] Click export
- [ ] Verify CSV only contains filtered records
- [ ] Verify record count matches filter summary

**Edge Cases**:
- [ ] Export with no filters (all records)
- [ ] Export with empty results (header only CSV)
- [ ] Export with special characters in justification
- [ ] Export with multi-line justification text

#### 4. Role-Based Access
**Admin User**:
- [ ] See all records in table
- [ ] See all options in all filter dropdowns
- [ ] Can approve/reject changes
- [ ] Export includes all records
- [ ] Purple "ADMINISTRADOR" badge shows

**Non-Admin User**:
- [ ] See only their own requests
- [ ] Filter dropdowns show only their data
- [ ] Cannot approve/reject (buttons hidden)
- [ ] Export includes only their records
- [ ] Blue "Apenas Visualização" badge shows
- [ ] Yellow warning message appears

#### 5. UI/UX Verification
- [ ] Table scrolls horizontally on small screens
- [ ] New approver column fits properly
- [ ] Filter buttons are clickable and responsive
- [ ] Dropdowns close on click outside
- [ ] Export button has hover effect
- [ ] Active filters show yellow highlighting
- [ ] Badge counts are accurate
- [ ] Colors match existing design system

#### 6. Performance Testing
- [ ] Test with 100+ records (smooth filtering)
- [ ] Multiple filter changes (no lag)
- [ ] Export large dataset (completes quickly)
- [ ] Table rendering (no visual jank)
- [ ] HMR updates work correctly

---

## 🐛 Troubleshooting

### Issue: Approver name not appearing
**Possible causes**:
1. Database migration not executed
2. Column name mismatch
3. Data not saving properly

**Solution**:
```sql
-- Check if column exists
SELECT * FROM information_schema.columns
WHERE table_name = 'manual_changes'
AND column_name = 'approved_by_name';

-- Check recent records
SELECT id, status, approved_by, approved_by_name
FROM manual_changes
WHERE status IN ('Aplicado', 'Reprovado')
ORDER BY approved_at DESC
LIMIT 5;
```

### Issue: Filters not working
**Check**:
1. Browser console for JavaScript errors
2. Filter state variables are initialized
3. filteredChanges useMemo is being called
4. Data actually exists for selected filter options

### Issue: CSV export empty or missing columns
**Check**:
1. filteredChanges has data
2. All 18 headers defined correctly
3. Data mapping includes all fields
4. UTF-8 BOM present for encoding

### Issue: Dropdown not closing
**Check**:
1. useRef properly attached to dropdown
2. Event listener registered correctly
3. No z-index conflicts

---

## 📊 Success Metrics

After deployment, verify:
- [x] Zero compilation errors
- [ ] Zero console errors in browser
- [ ] All 3 features working (approver display, filters, export)
- [ ] Both admin and non-admin users can use system
- [ ] CSV export includes new columns
- [ ] Existing functionality not broken
- [ ] No performance degradation

---

## 🔄 Rollback Plan

If critical issues arise:

### Quick Rollback (Code Only)
```bash
git log --oneline  # Find commit before changes
git revert <commit-hash>  # Revert to previous version
git push
```

### Full Rollback (Including Database)
```sql
-- Remove the new column (only if needed)
ALTER TABLE manual_changes DROP COLUMN approved_by_name;
```

**Note**: Only drop column if causing issues and no important data stored yet.

---

## 📝 Documentation Updates

After successful deployment:
- [ ] Update user documentation with new filter instructions
- [ ] Document CSV export columns for business users
- [ ] Add screenshots of new features
- [ ] Update changelog/release notes
- [ ] Notify admin users of new approver tracking feature

---

## 🎯 Final Checklist

**Before Going Live**:
- [ ] Database migration executed successfully
- [ ] All tests passed
- [ ] No console errors
- [ ] Admin and non-admin roles tested
- [ ] CSV export verified
- [ ] Filters working correctly
- [ ] Performance acceptable
- [ ] Rollback plan ready
- [ ] Team notified of new features

**After Going Live**:
- [ ] Monitor Supabase logs for errors
- [ ] Check user feedback
- [ ] Verify CSV exports are being used
- [ ] Monitor filter usage (analytics if available)
- [ ] Document any issues found
- [ ] Schedule follow-up review

---

## 📞 Support Contacts

**Technical Issues**:
- Supabase Dashboard: https://supabase.com/dashboard
- Project Repository: [your git repo]

**Questions**:
- Feature functionality
- Filter usage
- CSV export format
- Database queries

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Verified By**: _____________

**Status**:
- [ ] ✅ Fully Deployed & Verified
- [ ] ⚠️ Deployed with Minor Issues
- [ ] ❌ Deployment Failed - Rolled Back

**Notes**:
_________________________________________________
_________________________________________________
_________________________________________________
