module.exports = {
  models: {
    DatafinityObject: require('./schemas/DatafinityObjectSchema'),
    ImportStatus: require('./schemas/ImportStatusSchema'),
    AuthorityStatus: require('./schemas/AuthorityStatusSchema'),
    AuthorityObject: require('./schemas/AuthorityObjectSchema'),
    DepartmentsStatus: require('./schemas/DepartmentsStatusSchema'),
    DepartmentsObject: require('./schemas/DepartmentsObjectSchema'),
    DuplicateListObject: require('./schemas/DuplicateListObjectSchema'),
    DuplicateListStatus: require('./schemas/DuplicateListStatusSchema'),
    DescriptionStatus: require('./schemas/DescriptionStatusScema'),
    DescriptionObject: require('./schemas/DescriptionObjectSchema'),
  },
};
